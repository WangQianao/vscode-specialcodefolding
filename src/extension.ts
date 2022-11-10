import * as vscode from 'vscode';
import * as path from 'path';
import { ConsoleReporter } from '@vscode/test-electron';
import { start } from 'repl';
import { Position, Range } from 'vscode';
//const path = require('path');
// import * as generator from '@babel/generator';
// import * as parser from '@babel/parser';
// import * as traverse from '@babel/traverse';
// import * as types from '@babel/types';
const generator = require("@babel/generator");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const types = require("@babel/types");

function compile(code: string,offset:number,document:vscode.TextDocument) {
	// 1.parse
	const ast = parser.parse(code);
	
	// 2,traverse
	let variableDeclarationLoc:Range[]=[];
	const MyVisitor = {
		VariableDeclaration(path){
			variableDeclarationLoc.push(new Range(document.positionAt(path.node.start+offset),document.positionAt(path.node.end+offset)));

		},
		Function(path){
			variableDeclarationLoc.push(new Range(document.positionAt(0+offset),document.positionAt(path.node.body.start+offset+1)));
			variableDeclarationLoc.push(new Range(document.positionAt(path.node.body.end+offset-1),document.positionAt(path.node.body.end+offset)));
			
		}
	};
	// traverse 转换代码
	traverse.default(ast, MyVisitor);
	variableDeclarationLoc.sort(
		(a: Range, b: Range):number=>{
			const aindex=document.offsetAt(a.start);
			const bindex=document.offsetAt(b.start);
			return aindex-bindex;
		}
	)
	// for(let i=0;i<variableDeclarationLoc.length;i++)
	// {
	// 	console.log(`起始行：${variableDeclarationLoc[i].start.line},列：${variableDeclarationLoc[i].start.character}\t
	// 	终止行：${variableDeclarationLoc[i].end.line},列：${variableDeclarationLoc[i].end.character}`);
	// }
	return {"locArray":variableDeclarationLoc};
}
export function activate(context: vscode.ExtensionContext) {
	const decoration = vscode.window.createTextEditorDecorationType(
		{
			"textDecoration": "line-through"
		}
	);
	
	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.fold', async () => {

		const editor = vscode.window.activeTextEditor as vscode.TextEditor;
		const document=editor?.document as vscode.TextDocument;
		const code = document.getText(editor.selection);
		const startindex=document.offsetAt(editor?.selection.start);
		if (code !== undefined&&startindex!==undefined) {
			const data=compile(code,startindex,document);
			let decorationRange:Range[]=[];
			
			for(let i=0;i<=data.locArray.length;i++)
			{
				let st:Position=new Position(0,0),ed:Position=new Position(0,0);
				if(i===0){
					st=editor.selection.start;
					ed=document.positionAt(document.offsetAt(data.locArray[i].start)-1 );
				}else if(i===data.locArray.length){
					st=document.positionAt(document.offsetAt(data.locArray[i-1].end)+1); 
					ed=editor.selection.end;
				}else{
					st=document.positionAt(document.offsetAt(data.locArray[i-1].end)+1); 
					ed=document.positionAt(document.offsetAt(data.locArray[i].start)-1 );
				}
				decorationRange.push(new Range(st,ed));
			}
			editor?.setDecorations(decoration, decorationRange);
		}
		
	}));

	context.subscriptions.push(vscode.commands.registerCommand('codefoldingbasedonconerns.unfold', () => {
		const editor = vscode.window.activeTextEditor;
		editor?.setDecorations(decoration, []);

	}));

}

// This method is called when your extension is deactivated
export function deactivate() { }
