import { ConsoleReporter } from '@vscode/test-electron';
import * as vscode from 'vscode';
import { Position, Range, TextEditorDecorationType } from 'vscode';
import * as parser from '@babel/parser';
const generator = require("@babel/generator");
const traverse = require("@babel/traverse");
const types = require("@babel/types");
async function deal(code: string, document: vscode.TextDocument, outputChannel: vscode.OutputChannel, foldingKind: string) {
	// 1.parse
	try {
		let variableDeclarationLoc: Range[] = [];
		const ast = await parser.parse(code, { errorRecovery: true });
		//忽略注释
		if (ast.comments) {
			for (let i = 0; i < ast.comments.length; i++) {
				variableDeclarationLoc.push(new Range(document.positionAt(ast.comments[i].start!), document.positionAt(ast.comments[i].end!)));
			}
		}
		function cycleStatement(path) {
			if (path.node.body.type === 'BlockStatement') {
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.body.start + 1)));
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.end - 1), document.positionAt(path.node.end)));
				path.traverse(
					{
						BreakStatement(path) {
							variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
						},
						ContinueStatement(path) {
							variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
						}
					}
				);
			} else if (path.node.body.type === 'BreakStatement' || path.node.body.type === 'ContinueStatement') {
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
			} else {
				variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.body.start - 1)));
			}
		}
		// 2,traverse
		const MyVisitor = {
			Function(path) {
				let st = 0;
				let ed = 0;
				if (path.node.body.body !== undefined) {
					st = path.node.body.body[0].start - 1;
					ed = path.node.body.body[path.node.body.body.length - 1].end + 1;
				} else {
					st = path.node.body.start - 1;
					ed = path.node.body.end + 1;
				}
				if (path.node.start < st) {
					variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(st)));
				}
				if (ed < path.node.end) {
					variableDeclarationLoc.push(new Range(document.positionAt(ed), document.positionAt(path.node.end)));
				}
				if (foldingKind === 'VariableDeclaration') {
					path.traverse(
						{
							VariableDeclaration(path) {
								variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));

							}, Function(path) {
								return;
							}
						}
					);
				} else if (foldingKind === 'BranchControl') {
					path.traverse(
						{
							IfStatement(path) {

								if (path.node.consequent.type === 'BlockStatement') {
									variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.consequent.start + 1)));
									if (path.node.alternate) {
										variableDeclarationLoc.push(new Range(document.positionAt(path.node.consequent.end - 1), document.positionAt(path.node.alternate.start - 1)));
									}
									else {
										variableDeclarationLoc.push(new Range(document.positionAt(path.node.consequent.end - 1), document.positionAt(path.node.consequent.end)));
									}
								} else {
									variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.consequent.start - 1)));
									if (path.node.alternate) {
										variableDeclarationLoc.push(new Range(document.positionAt(path.node.consequent.end + 1), document.positionAt(path.node.alternate.start - 1)));
									}
								}
								if (path.node.alternate) {
									if (path.node.alternate.type === 'IfStatement') {
										return;
									} else if (path.node.alternate.type === 'BlockStatement') {


										variableDeclarationLoc.push(new Range(document.positionAt(path.node.alternate.start), document.positionAt(path.node.alternate.start)));
										variableDeclarationLoc.push(new Range(document.positionAt(path.node.alternate.end - 1), document.positionAt(path.node.alternate.end)));
									}
								}
							},
							SwitchStatement(path) {
								if (path.node.cases.length > 0) {
									variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.cases[0].start - 1)));
									for (let i = 0; i < path.node.cases.length; i++) {
										if (path.node.cases[i].consequent) {
											variableDeclarationLoc.push(new Range(document.positionAt(path.node.cases[i].start), document.positionAt(path.node.cases[i].consequent[0].start - 1)));
											for (let j = 0; j < path.node.cases[i].consequent.length; j++) {
												if (path.node.cases[i].consequent[j].type === 'BreakStatement') {
													variableDeclarationLoc.push(new Range(document.positionAt(path.node.cases[i].consequent[j].start), document.positionAt(path.node.cases[i].consequent[j].end)));
												}
											}
										} else {
											variableDeclarationLoc.push(new Range(document.positionAt(path.node.cases[0].start), document.positionAt(path.node.cases[0].end)));
										}

									}
									variableDeclarationLoc.push(new Range(document.positionAt(path.node.end - 1), document.positionAt(path.node.end)));

								} else {
									variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
								}

							},
							WhileStatement(path) {
								cycleStatement(path);
							},
							DoWhileStatement(path) {
								cycleStatement(path);
							},
							ForStatement(path) {
								cycleStatement(path);

							}, ForInStatement(path) {
								cycleStatement(path);
							},
							Function(path) {
								return;
							}
						});
				}
			}
		};
		console.log("rrrr");
		// traverse 转换代码
		await traverse.default(ast, MyVisitor);
		console.log("tttttt");
		for (let i = 0; i < variableDeclarationLoc.length; i++) {
			console.log(`起始行：${variableDeclarationLoc[i].start.line},列：${variableDeclarationLoc[i].start.character}\t
			终止行：${variableDeclarationLoc[i].end.line},列：${variableDeclarationLoc[i].end.character}`);
		}
		return variableDeclarationLoc;
	} catch (error: any) {
		outputChannel.append(error.message);
		outputChannel.append('\n');

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
async function updateDecorations(decoration: TextEditorDecorationType, editor: vscode.TextEditor, outputChannel: vscode.OutputChannel, foldingKind: string) {
	editor.setDecorations(decoration, []);
	const code = editor.document.getText();
	const document = editor.document as vscode.TextDocument;
	if (document.languageId !== 'javascript') {
		return -1;
	}
	const data = await deal(code, editor.document, outputChannel, foldingKind);
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
	// for (let i = 0; i < data.length; i++) {
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
			ed = document.positionAt(s2);
			decorationRange.push(new Range(st, ed));
			tempRange = data[i];
		}
	}
	if (document.offsetAt(tempRange.end) < document.offsetAt(document.lineAt(document.lineCount - 1).range.end)) {
		decorationRange.push(new Range(document.positionAt(document.offsetAt(tempRange.end) + 1), document.lineAt(document.lineCount - 1).range.end));
	}
	// console.log("*******************");
	// for (let i = 0; i < decorationRange.length; i++) {
	// 	console.log(`起始行：${decorationRange[i].start.line},列：${decorationRange[i].start.character}\t
	// 	终止行：${decorationRange[i].end.line},列：${decorationRange[i].end.character}`);
	// }
	editor?.setDecorations(decoration, decorationRange);
	return 0;
}
export function activate(context: vscode.ExtensionContext) {
	let decoration: TextEditorDecorationType = vscode.window.createTextEditorDecorationType({ "textDecoration": "line-through" });
	let activeEditor = vscode.window.activeTextEditor;
	const codeFoldingChannel = vscode.window.createOutputChannel('codeFolding');
	let foldState: number = 0;//0表示没有折叠，1表示有折叠命令
	let foldingKind: string = vscode.workspace.getConfiguration('codeFolding').get('kind') as string;
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', async () => {
		if (activeEditor) {
			const re = await updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
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
				updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
			}
		}, null, context.subscriptions
	);
	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document && foldState === 1) {
			updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
		}
	}, null, context.subscriptions);
	vscode.workspace.onDidChangeConfiguration(
		(e: vscode.ConfigurationChangeEvent) => {
			if (e.affectsConfiguration('codeFolding.kind')) {
				const workspaceSettings = vscode.workspace.getConfiguration('codeFolding');
				foldingKind = workspaceSettings.get('kind') as string;
				console.log(foldingKind);
				if (activeEditor && foldState === 1) {
					updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
				}
			}
		}, null, context.subscriptions
	);
}
// This method is called when your extension is deactivated
export function deactivate() { }
