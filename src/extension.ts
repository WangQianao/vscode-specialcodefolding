
import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';
// import * as vsctm from 'vscode-textmate';
// import * as oniguruma from 'vscode-oniguruma';
const fs = require('fs');
const path = require('path');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');


function readFile(path: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (error: NodeJS.ErrnoException | null, data: Buffer) => error ? reject(error) : resolve(data));
	});
}
function tokenText(extensionUri:string) {
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
		loadGrammar: (scopeName:string) => {
			// https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
			return readFile(path.join(extensionUri, '/src/res/grammar/JavaScript.plist')).then(data => vsctm.parseRawGrammar(data.toString()));

		}
	});
	// Load the JavaScript grammar and any other grammars included by it async.
	registry.loadGrammar('source.js').then((grammar:any) => {
		const text = [
			`function sayHello(name) {`,
			`\treturn "Hello, " + name;`,
			`}`
		];
		if (grammar !== null) {
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

	});
}

export function activate(context: vscode.ExtensionContext) {
	
	
	let foldDecorationType = vscode.window.createTextEditorDecorationType(
		{
			"opacity": "0"
		}
	);
	tokenText(context.extensionUri.path.substring(1));
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', () => {

		const editor = vscode.window.activeTextEditor;
		//const text=editor?.document.getText(editor.selection);
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
