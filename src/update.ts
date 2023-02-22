
import * as vscode from 'vscode';
import { Position, Range, TextEditorDecorationType } from 'vscode';
import { deal, findBlankInLineBegin } from './dealCode';
import axios from 'axios';
export async function updateDecorations(decoration: TextEditorDecorationType, editor: vscode.TextEditor, outputChannel: vscode.OutputChannel, foldingKind: string) {
    editor.setDecorations(decoration, []);
    let code='';
    if(foldingKind=="CodeSummary")
    {
        code=editor.document.getText(editor.selection)
        const Url='http://127.0.0.1:8000/'
        axios({
            method:'post',
            url:Url,
            data:{
                code
            }
        }).then(data=>{
            if(editor)
            {
                editor.edit(editBuilder =>{
                    editBuilder.insert(editor.selection.start,"//"+data.data+"\n")
                })

            }
        })
        .catch(err=>console.log(err))
        return 0
    }else{
       code = editor.document.getText();
    }
    const document = editor.document as vscode.TextDocument;
    if (document.languageId !== 'javascript') {
        return -1;
    }
    const data = await deal(code, editor.document, outputChannel, foldingKind);
    if (data === undefined) {
        return -1;
    }
    findBlankInLineBegin(code, data, document);
    data.sort(//以右边界排序
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
    let decorationRange: Range[] = [];
    let tempRange: Range = data[0];
    if (foldingKind !== 'Exception') {

        //处理大区间包含小区间的情况
        for (let i = 0; i < data.length - 1; i++) {
            let s1 = document.offsetAt(data[i].start), e1 = document.offsetAt(data[i].end);
            let s2 = document.offsetAt(data[i + 1].start), e2 = document.offsetAt(data[i + 1].end);
            if (e2 < e1) {
                let lastInterval = i + 1;
                for (let j = i + 2; j < data.length; j++) {
                    let e3 = document.offsetAt(data[j].end);
                    if (e3 < e1) {

                        lastInterval = j;
                    } else { break; }
                }
                data.splice(lastInterval + 1, 0, new Range(document.positionAt(document.offsetAt(data[lastInterval].end) + 1), document.positionAt(e1)));
                data.splice(i + 1, 0, new Range(document.positionAt(s1), document.positionAt(s2 - 1)));
                data.splice(i, 1);
            }
        }

    }
    if (document.offsetAt(data[0].start) > 0) {
        decorationRange.push(new Range(new Position(0, 0), document.positionAt(document.offsetAt(data[0].start) - 1)));
    }
    for (let i = 1; i < data.length; i++) {
        let s1 = document.offsetAt(tempRange.start), e1 = document.offsetAt(tempRange.end);
        let s2 = document.offsetAt(data[i].start), e2 = document.offsetAt(data[i].end);
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
    editor?.setDecorations(decoration, decorationRange);
    return 0;
}