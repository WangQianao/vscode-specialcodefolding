
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

	
	let foldDecorationType=vscode.window.createTextEditorDecorationType(
		{
			"opacity":"0"
		}
	);
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', () => {
		
		const editor=vscode.window.activeTextEditor;
		const text=editor?.document.getText(editor.selection);
		foldDecorationType=vscode.window.createTextEditorDecorationType(
			{
				"opacity":"0"
			});
		
		


		
		editor?.setDecorations(foldDecorationType,[editor.selection]);

	}));
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.unfold', () => {
		
		const editor=vscode.window.activeTextEditor;
		const text=editor?.document.getText(editor.selection);
		foldDecorationType.dispose();
		editor?.setDecorations(foldDecorationType,[editor.selection]);

	}));
	
}

// This method is called when your extension is deactivated
export function deactivate() {}
