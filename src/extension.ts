import * as vscode from 'vscode';
import { TextEditorDecorationType } from 'vscode';
import { updateDecorations } from './update';

export function activate(context: vscode.ExtensionContext) {
	let decoration: TextEditorDecorationType = vscode.window.createTextEditorDecorationType({ "textDecoration": "line-through" });
	let activeEditor = vscode.window.activeTextEditor;
	const codeFoldingChannel = vscode.window.createOutputChannel('codeFolding');
	let foldState: number = 0;//0表示没有折叠，1表示有折叠命令
	let foldingKind: string = vscode.workspace.getConfiguration('codeFolding').get('kind') as string;
	context.subscriptions.push(vscode.commands.registerCommand('specialcodefolding.fold', async () => {
		if (activeEditor) {
			const re = await updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
			if (re === 0) {
				foldState = 1;
			}
		}
	}));
	context.subscriptions.push(vscode.commands.registerCommand('specialcodefolding.expand', () => {
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
				if (activeEditor && foldState === 1) {
					updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind);
				}
			}
		}, null, context.subscriptions
	);
}
// This method is called when your extension is deactivated
export function deactivate() { }
