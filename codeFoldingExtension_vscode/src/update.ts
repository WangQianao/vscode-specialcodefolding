import * as vscode from 'vscode';
import { Position, Range, TextEditorDecorationType } from 'vscode';
import { deal, findBlankInLineBegin } from './dealCode';
import axios from 'axios';
import {DecorationAndRange} from './extension'
export async function updateDecorations(decoration: TextEditorDecorationType, editor: vscode.TextEditor,
     outputChannel: vscode.OutputChannel, foldingKind: string,all_decoration:DecorationAndRange[]) {
    editor.setDecorations(decoration, []);
    let code = '';
    const document = editor.document as vscode.TextDocument;
    if (document.languageId !== 'javascript') {
        return -1;
    }
    if (foldingKind == "CodeSummary") {
        for (let i = 0; i < editor.selections.length; i++) {

            code = editor.document.getText(editor.selections[i])
            const Url = 'http://127.0.0.1:8000/'
            axios({
                method: 'post',
                url: Url,
                data: {
                    code
                }
            }).then(data => {
                if (editor) {
                    const attribution = data.data.attribution
                    const token_index = data.data.token_index
                    const begin_offset = document.offsetAt(editor.selections[i].start)
                    // console.log(attribution)
                    // console.log(token_index)
                    for (let j = 0; j < token_index.length; j++) {
                        let score = attribution[j];
                        //使用hsla颜色值对代码重要性进行标注
                        score = Math.max(-1, Math.min(1, score))
                        let hue, sat, lig
                        if (score > 0) {
                            hue = 120
                            sat = 75
                            lig = 100 - Math.round(50 * score)
                        }
                        else {
                            hue = 0
                            sat = 75
                            lig = 100 - Math.round(-40 * score)
                        }
                        let decoration: TextEditorDecorationType = vscode.
                            window.createTextEditorDecorationType({ "backgroundColor": `hsl(${hue}, ${sat}%, ${lig}%,1)` });
                        let decorationRange: Range[] = [];
                        decorationRange.push(new Range(document.positionAt(begin_offset + (j - 1 >= 0 ? token_index[j - 1] : 0)),
                            document.positionAt(begin_offset + token_index[j])))
                        editor?.setDecorations(decoration, decorationRange)
                        // console.log(decorationRange[0].start.line+" "+decorationRange[0].start.character)
                        // console.log(decorationRange[0].end.line+" "+decorationRange[0].end.character)
                        // console.log("***************************")
                        all_decoration.push(new DecorationAndRange(decoration,decorationRange)) 
                    }
                    editor.edit(editBuilder => {
                        editBuilder.insert(
                            new Position(editor.selections[i].end.line+1,0)
                            , "//" + data.data.summary + "\n")
                    })
                }
            })
                .catch(err => console.log(err))
        }
        return 0
    } else {
        code = editor.document.getText();
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