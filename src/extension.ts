import { ConsoleReporter } from '@vscode/test-electron';
import * as vscode from 'vscode';
import { Position, Range, TextEditorDecorationType } from 'vscode';
import * as parser from '@babel/parser';
// import * as babylon from 'babylon';
const generator = require("@babel/generator");
//const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const types = require("@babel/types");
async function deal(code: string, document: vscode.TextDocument) {
	// 1.parse
	console.log('bbbb');
	try {
		const ast = await parser.parse(code, { errorRecovery: true });
		console.log('aaaa');
		console.log(ast.errors);
		// 2,traverse
		let variableDeclarationLoc: Range[] = [];
		const MyVisitor = {
			Function(path) {
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.body.start + 1)));
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.body.end - 1), document.positionAt(path.node.body.end)));
				path.traverse(
					{
						VariableDeclaration(path) {
							variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
						}
					}
				);
			}
		};
		// traverse 转换代码
		traverse.default(ast, MyVisitor);

		// for(let i=0;i<variableDeclarationLoc.length;i++)
		// {
		// 	console.log(`起始行：${variableDeclarationLoc[i].start.line},列：${variableDeclarationLoc[i].start.character}\t
		// 	终止行：${variableDeclarationLoc[i].end.line},列：${variableDeclarationLoc[i].end.character}`);
		// }
		return variableDeclarationLoc;
	} catch (error: any) {
		vscode.window.showErrorMessage(error.message);
	}
}
function findBlankInLineBegin(code: string, variableDeclarationLoc: Range[], document: vscode.TextDocument) {
	//处理编辑器每一行前面也加上了删除线的问题,如果一行里面只有空格，也要处理
	//一行前面如果有空格，空格不应该加删除线
	const lines = code.split('\r\n');
	for (let i = 0; i < lines.length; i++) {
		let k = 0;
		for (k = 0; k < lines[i].length; k++) {
			if (lines[i][k] !== ' ') {
				break;
			}
		}
		if (k !== 0) {
			const st = new Position(i, 0);
			const ed = new Position(i, k - 1);
			variableDeclarationLoc.push(new Range(st, ed));
		}
	}
}
async function updateDecorations(decoration: TextEditorDecorationType, editor: vscode.TextEditor) {
	console.log(typeof (decoration));
	console.log(typeof (editor));
	editor.setDecorations(decoration, []);
	const code = editor.document.getText();
	const document = editor.document as vscode.TextDocument;
	if(document.languageId!=='javascript')
	{
		return -1;
	}
	const data = await deal(code, editor.document);
	if (data === undefined) {
		return -1;
	}
	findBlankInLineBegin(code, data, document);
	data.sort(//希望以左边界排序，左边界相同情况下，右边界大的排前面
		(a: Range, b: Range): number => {
			const s1 = document.offsetAt(a.start);
			const s2 = document.offsetAt(b.start);
			if (s1 !== s2) {
				return s1 - s2;
			} else {
				const e1 = document.offsetAt(a.end);
				const e2 = document.offsetAt(b.end);
				return e2 - e1;
			}

		}
	);
	// for(let i=0;i<data.length;i++)
	// {
	// 	console.log(`起始行：${data[i].start.line},列：${data[i].start.character}\t
	// 	终止行：${data[i].end.line},列：${data[i].end.character}`);
	// }
	let decorationRange: Range[] = [];
	let tempRange: Range = data[0];
	if (document.offsetAt(data[0].start) > 0) {
		decorationRange.push(new Range(new Position(0, 0), document.positionAt(document.offsetAt(data[0].start) - 1)));
	}
	for (let i = 1; i < data.length; i++) {
		let s1 = document.offsetAt(tempRange.start), e1 = document.offsetAt(tempRange.end);
		let s2 = document.offsetAt(data[i].start), e2 = document.offsetAt(data[i].end);
		// console.log(`起始行：${tempRange.start.line},列：${tempRange.start.character}\t
		// 终止行：${tempRange.end.line},列：${tempRange.end.character}`);
		if (e2 <= e1) {
			continue;
		} else if (s2 <= e1 + 1) {
			tempRange = new Range(document.positionAt(s1), document.positionAt(e2));
		} else {
			let st: Position = new Position(0, 0), ed: Position = new Position(0, 0);
			st = document.positionAt(e1 + 1);
			ed = document.positionAt(s2 - 1);
			decorationRange.push(new Range(st, ed));
			tempRange = data[i];
		}
	}
	if (document.offsetAt(tempRange.end) < document.offsetAt(document.lineAt(document.lineCount - 1).range.end)) {
		decorationRange.push(new Range(document.positionAt(document.offsetAt(tempRange.end) + 1), document.lineAt(document.lineCount - 1).range.end));
	}
	editor?.setDecorations(decoration, decorationRange);
	return 0;

}
export function activate(context: vscode.ExtensionContext) {
	let decoration: TextEditorDecorationType = vscode.window.createTextEditorDecorationType({ "textDecoration": "line-through" });
	let activeEditor = vscode.window.activeTextEditor;
	let foldState: number = 0;//0表示没有折叠，1表示有折叠命令
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', async () => {
		if (activeEditor) {
			const re = await updateDecorations(decoration, activeEditor);
			if (re === 0) {
				foldState = 1;
			}
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.unfold', () => {
		if (activeEditor) {
			activeEditor.setDecorations(decoration, []);
			foldState = 0;
		}
	}));
	vscode.window.onDidChangeActiveTextEditor(
		(editor: vscode.TextEditor | undefined) => {
			activeEditor = editor;
			if (activeEditor && foldState === 1) {
				updateDecorations(decoration, activeEditor);
			}
		}, null, context.subscriptions
	);
	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document && foldState === 1) {
			updateDecorations(decoration, activeEditor);
		}
	}, null, context.subscriptions);
}
// This method is called when your extension is deactivated
export function deactivate() { }
