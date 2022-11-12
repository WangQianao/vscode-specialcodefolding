import { ConsoleReporter } from '@vscode/test-electron';
import * as vscode from 'vscode';
import { Position, Range } from 'vscode';
import * as parser from '@babel/parser';
const generator = require("@babel/generator");
//const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const types = require("@babel/types");

function compile(code: string, offset: number, document: vscode.TextDocument) {
	// 1.parse
	const ast = parser.parse(code, { errorRecovery: true });
	// 2,traverse
	let variableDeclarationLoc: Range[] = [];
	const MyVisitor = {
		VariableDeclaration(path) {
			variableDeclarationLoc.push(new Range(document.positionAt(path.node.start + offset), document.positionAt(path.node.end + offset)));
		},
		Function(path) {
			variableDeclarationLoc.push(new Range(document.positionAt(path.node.start + offset), document.positionAt(path.node.body.start + offset + 1)));
			variableDeclarationLoc.push(new Range(document.positionAt(path.node.body.end + offset - 1), document.positionAt(path.node.body.end + offset)));
			// console.log(document.positionAt(0+offset).line,document.positionAt(0+offset).character);
			// console.log(document.positionAt(path.node.body.start+offset+1).line,document.positionAt(path.node.body.start+offset+1).character);
			// console.log(document.positionAt(path.node.body.end+offset-1).line,document.positionAt(path.node.body.end+offset-1).character);
			// console.log(document.positionAt(path.node.body.end+offset).line,document.positionAt(path.node.body.end+offset).character);
			// console.log("*****************************");
		}
	};
	// traverse 转换代码
	traverse.default(ast, MyVisitor);

	// for(let i=0;i<variableDeclarationLoc.length;i++)
	// {
	// 	console.log(`起始行：${variableDeclarationLoc[i].start.line},列：${variableDeclarationLoc[i].start.character}\t
	// 	终止行：${variableDeclarationLoc[i].end.line},列：${variableDeclarationLoc[i].end.character}`);
	// }
	return { "locArray": variableDeclarationLoc };
}
function findBlankInLineBegin(code:string,selection:Range,variableDeclarationLoc: Range[]) {
	//处理编辑器每一行前面也加上了删除线的问题
	const lines = code.split('\r\n');
	const startLine = selection.start.line;
	const startIndex = selection.start.character;
	for (let i = 0; i < lines.length; i++) {
		let offset = -1;
		let st = 0;
		for (let k = 0; k < lines[i].length; k++) {
			if (lines[i][k] !== ' ') {
				offset = k - 1;
				break;
			}
		}
		if (offset !== -1) {
			if (i === 0) {
				offset += startIndex;
				st += startIndex;
			}
			const be = new Position(i + startLine, st);
			const ed = new Position(i + startLine, offset);
			variableDeclarationLoc.push(new Range(be, ed));
		}

	}
}
export function activate(context: vscode.ExtensionContext) {

	let decorationArray: Object[] = [];
	const decoration = vscode.window.createTextEditorDecorationType({ "textDecoration": "line-through" });
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', async () => {

		const editor = vscode.window.activeTextEditor as vscode.TextEditor;
		const document = editor?.document as vscode.TextDocument;
		for (let j = 0; j < editor.selections.length; j++) {
			
			decorationArray.push({ "decoration": decoration, "loc": editor.selections[j] });
			const code = document.getText(editor.selections[j]);
			const startindex = document.offsetAt(editor?.selections[j].start);
			if (code !== undefined && startindex !== undefined) {
				const data = compile(code, startindex, document);
				findBlankInLineBegin(code,editor.selections[j],data.locArray);
				data.locArray.sort(//希望以左边界排序，左边界相同情况下，右边界大的排前面
					(a: Range, b: Range): number => {
						const s1 = document.offsetAt(a.start);
						const s2 = document.offsetAt(b.start);
						if(s1!==s2)
						{
							return s1 - s2;
						}else{
							const e1 = document.offsetAt(a.end);
							const e2 = document.offsetAt(b.end);
							return e2-e1;
						}
						
					}
				);
				// for(let i=0;i<data.locArray.length;i++)
				// {
				// 	console.log(`起始行：${data.locArray[i].start.line},列：${data.locArray[i].start.character}\t
				// 	终止行：${data.locArray[i].end.line},列：${data.locArray[i].end.character}`);
				// }
				let decorationRange: Range[] = [];
				let tempRange:Range=data.locArray[0];
				if(document.offsetAt(data.locArray[0].start)>document.offsetAt(editor.selections[j].start))
				{
					decorationRange.push(new Range(editor.selections[j].start,document.positionAt(document.offsetAt(data.locArray[0].start) - 1)));
				}
				for (let i = 1; i < data.locArray.length; i++) {//使用经典贪心算法求解区间问题
					let s1=document.offsetAt(tempRange.start),e1=document.offsetAt(tempRange.end);
					let s2=document.offsetAt(data.locArray[i].start),e2=document.offsetAt(data.locArray[i].end);
					// console.log(`起始行：${tempRange.start.line},列：${tempRange.start.character}\t
					// 终止行：${tempRange.end.line},列：${tempRange.end.character}`);
					if(e2<=e1)
					{
						continue;
					}else if(s2<=e1+1)
					{
						tempRange=new Range(document.positionAt(s1),document.positionAt(e2));
					}else{
						let st: Position = new Position(0, 0), ed: Position = new Position(0, 0);
						st = document.positionAt(e1+1);
						ed = document.positionAt(s2-1);
						decorationRange.push(new Range(st, ed));
						tempRange=data.locArray[i];
					}
				}
				if(document.offsetAt(tempRange.end)<document.offsetAt(editor.selections[j].end)){
					decorationRange.push(new Range(document.positionAt(document.offsetAt(tempRange.end)+1), editor.selections[j].end));
				}
				
				editor?.setDecorations(decoration, decorationRange);
			}
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.unfold', () => {
		const editor = vscode.window.activeTextEditor as vscode.TextEditor;
		const document = editor?.document as vscode.TextDocument;
		for (let j = 0; j < editor.selections.length; j++) {
			let begin = document.offsetAt(editor.selections[j].start);
			let end = document.offsetAt(editor.selections[j].end);
			for (let i = 0; i < decorationArray.length; i++) {
				let st = document.offsetAt(decorationArray[i]["loc"].start);
				let ed = document.offsetAt(decorationArray[i]["loc"].end);
				if (st >= begin && ed <= end) {
					let tempObj = decorationArray[i];
					decorationArray.filter(obj => obj !== tempObj);
					let decoration = tempObj["decoration"];
					decoration.dispose();
				}
			}
		}
	}));
}
// This method is called when your extension is deactivated
export function deactivate() { }
