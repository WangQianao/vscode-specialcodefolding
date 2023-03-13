import { start } from 'repl';
import * as vscode from 'vscode';
import { TextEditorDecorationType, Range } from 'vscode';
import { updateDecorations } from './update';

export class DecorationAndRange{
	decoration: vscode.TextEditorDecorationType;
	range: vscode.Range[];
	constructor(decoration:TextEditorDecorationType,range:Range[]){
		this.decoration=decoration
		this.range=range;
	}
}
export function activate(context: vscode.ExtensionContext) {
	
	let all_decoration:DecorationAndRange[]=[];
	let decoration: TextEditorDecorationType = vscode.window.createTextEditorDecorationType({ "textDecoration": "line-through" });
	let activeEditor = vscode.window.activeTextEditor;
	const codeFoldingChannel = vscode.window.createOutputChannel('codeFolding');
	let foldState: number = 0;//0表示没有折叠，1表示有折叠命令
	let foldingKind: string = vscode.workspace.getConfiguration('codeFolding').get('kind') as string;
	context.subscriptions.push(vscode.commands.registerCommand('specialcodefolding.fold', async () => {
		if (activeEditor) {
			const re = await updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind,all_decoration);
			if (re === 0) {
				foldState = 1;
			}
		}
	}));
	context.subscriptions.push(vscode.commands.registerCommand('specialcodefolding.expand', () => {
		if (activeEditor) {
			if(foldingKind == "CodeSummary")
			{
				const document = activeEditor.document as vscode.TextDocument;
				for(let i=0;i<activeEditor.selections.length;i++)
				{
					let selection=activeEditor.selections[i]			
					for(let j=0;j<all_decoration.length;j++)
					{
						let temp_range=all_decoration[j].range
					
						if(document.offsetAt(temp_range[0].start)>=document.offsetAt(selection.start)
						&& document.offsetAt(temp_range[0].end)<=document.offsetAt(selection.end))
						{		
							activeEditor.setDecorations(all_decoration[j].decoration, []);
							//将这一个装饰从数组中删除
							all_decoration.splice(j,1);
							j--;
						}
					}
				}	
			}else{
				activeEditor.setDecorations(decoration, []);
			}
			
			foldState = 0;
			
		}
	}));
	vscode.window.onDidChangeActiveTextEditor(
		(editor: vscode.TextEditor | undefined) => {
			activeEditor = editor;
			if (activeEditor && foldState === 1&&foldingKind!="CodeSummary") {
				updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind,all_decoration);
			}
		}, null, context.subscriptions
	);
	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document && foldState === 1&&foldingKind!="CodeSummary") {
			updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind,all_decoration);
		}
	}, null, context.subscriptions);
	vscode.workspace.onDidChangeConfiguration(
		(e: vscode.ConfigurationChangeEvent) => {
			if (e.affectsConfiguration('codeFolding.kind')) {
				const workspaceSettings = vscode.workspace.getConfiguration('codeFolding');
				foldingKind = workspaceSettings.get('kind') as string;
				if (activeEditor && foldState === 1) {
					updateDecorations(decoration, activeEditor, codeFoldingChannel, foldingKind,all_decoration);
				}
			}
		}, null, context.subscriptions
	);
}
// This method is called when your extension is deactivated
export function deactivate() { }
