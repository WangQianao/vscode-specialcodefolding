
import { text } from 'stream/consumers';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as vsctm from 'vscode-textmate';
//const fs = require('fs');
const path = require('path');
//const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');


// function readFile(path: string): Promise<Buffer> {
// 	return new Promise((resolve, reject) => {
// 		fs.readFile(path, (error: NodeJS.ErrnoException | null, data: Buffer) => error ? reject(error) : resolve(data));
// 	});
// }
async function tokenText(extensionUri:string,originText?:string) {
	
	const wasmBin = fs.readFileSync(path.join(extensionUri, '/src/res/oniguruma/onig.wasm')).buffer;
	const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
		return {
			createOnigScanner(patterns: any) { return new oniguruma.OnigScanner(patterns); },
			createOnigString(s: any) { return new oniguruma.OnigString(s); }
		};
	});
	// Create a registry that can create a grammar from a scope name.
	const registry = new vsctm.Registry({
		onigLib: vscodeOnigurumaLib,
		
		loadGrammar: async (scopeName:string) => {
			if (scopeName === 'source.java') {
				
				// https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
				const grammarFilePath=path.join(extensionUri, '/src/res/grammar/java.tmLanguage.json');
				const response = await new Promise<string>((resolve, reject) => {
					fs.readFile(grammarFilePath, (e, v) => e ? reject(e) : resolve(v.toString()));
				});
				const g = vsctm.parseRawGrammar(response, path.resolve(grammarFilePath));
				return g;
			}
			console.log(`Unknown scope name: ${scopeName}`);
			return null;

		}
	});
	// Load the JavaScript grammar and any other grammars included by it async.
	const grammar = await registry.loadGrammar('source.java');
	
		const text=originText?.split('\r\n');
		if (grammar!==null&&text!==undefined) {
			let ruleStack = vsctm.INITIAL;
			for (let i = 0; i < text.length; i++) {
				const line = text[i];
				const lineTokens = grammar.tokenizeLine(line, ruleStack);
				console.log(`\nTokenizing line: ${line}`);
				for (let j = 0; j < lineTokens.tokens.length; j++) {
					const token = lineTokens.tokens[j];
					console.log(` - token from ${token.startIndex} to ${token.endIndex} ` +
						`(${line.substring(token.startIndex, token.endIndex)}) ` +
						`with scopes ${token.scopes.join(', ')}`
					);
				}
				ruleStack = lineTokens.ruleStack;
			}
		}
}

export function activate(context: vscode.ExtensionContext) {
	
	
	let foldDecorationType = vscode.window.createTextEditorDecorationType(
		{
			"opacity": "0"
		}
	);
	
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', async () => {

		const editor = vscode.window.activeTextEditor;
		const text=editor?.document.getText(editor.selection);
		
		await tokenText(context.extensionUri.path.substring(1),text);
		foldDecorationType = vscode.window.createTextEditorDecorationType(
			{
				"opacity": "0"
			});
		editor?.setDecorations(foldDecorationType, [editor.selection]);

	}));
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.unfold', () => {

		const editor = vscode.window.activeTextEditor;
		const text = editor?.document.getText(editor.selection);
		foldDecorationType.dispose();
		editor?.setDecorations(foldDecorationType, [editor.selection]);

	}));

}

// This method is called when your extension is deactivated
export function deactivate() { }
