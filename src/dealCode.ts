/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { Position, Range } from 'vscode';
import * as parser from '@babel/parser';
import * as types from '@babel/types';
const traverse = require("@babel/traverse");
export async function deal(code: string, document: vscode.TextDocument, outputChannel: vscode.OutputChannel, foldingKind: string) {
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
                if (path.node.body.type === 'BlockStatement') {
                    variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.body.start + 1)));
                    variableDeclarationLoc.push(new Range(document.positionAt(path.node.body.end - 1), document.positionAt(path.node.end)));
                } else {
                    variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.body.start - 1)));
                    variableDeclarationLoc.push(new Range(document.positionAt(path.node.body.end + 1), document.positionAt(path.node.end)));
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
                } else if (foldingKind === 'ConcreteAction') {
                    path.traverse(
                        {
                            ExpressionStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));

                            }, VariableDeclarator(path) {
                                if (path.node.init) {
                                    variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end + 1)));
                                }

                            },
                            BreakStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
                            }, ContinueStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
                            },
                            ReturnStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
                            },
                            Function(path) {
                                return;
                            }
                        }
                    );
                } else if (foldingKind === 'FunctionParams') {
                    if (path.node.params.length === 0) { return; }
                    let paramsName: string[] = [];
                    for (let i = 0; i < path.node.params.length; i++) {
                        paramsName.push(path.node.params[i].name);
                    }
                    const son = path.get('body');
                    son.traverse(
                        {
                            Identifier(path) {
                                if (paramsName.indexOf(path.node.name) !== -1) {
                                    let fpath = path.findParent((path) =>
                                        types.isExpression(path.node) || types.isVariableDeclarator(path.node));
                                    if (fpath) {
                                        variableDeclarationLoc.push(new Range(document.positionAt(fpath.node.start), document.positionAt(fpath.node.end)));
                                    } else {
                                        variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end - 1)));
                                    }

                                }
                            }
                        }
                    );
                } else if (foldingKind === 'Returnvalue') {
                    let paramsName: string[] = [];
                    path.traverse(
                        {
                            ReturnStatement(path) {
                                if (path.node.argument) {
                                    path.traverse(
                                        {
                                            Identifier(path) {
                                                paramsName.push(path.node.name);
                                            }
                                        }
                                    );
                                }
                            }
                        }
                    );
                    //给参数数组去重
                    paramsName = paramsName.filter(
                        (value: string, index: number, array: string[]) => {
                            return paramsName.indexOf(value, 0) === index;
                        }
                    );
                    const son = path.get('body');
                    son.traverse(
                        {
                            Identifier(path) {
                                if (paramsName.indexOf(path.node.name) !== -1) {
                                    let fpath = path.findParent((path) =>
                                        types.isExpression(path.node) || types.isVariableDeclarator(path.node));
                                    if (fpath) {
                                        variableDeclarationLoc.push(new Range(document.positionAt(fpath.node.start), document.positionAt(fpath.node.end)));
                                    } else {
                                        variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end - 1)));
                                    }

                                }
                            }
                        }
                    );
                } else if (foldingKind === 'Abnormal') {
                    path.traverse(
                        {
                            TryStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
                            },
                            ThrowStatement(path) {
                                variableDeclarationLoc.push(new Range(document.positionAt(path.node.start), document.positionAt(path.node.end)));
                            }
                        }
                    );
                }
            }
        };
        // traverse 转换代码
        await traverse.default(ast, MyVisitor);
        return variableDeclarationLoc;
    } catch (error: any) {
        outputChannel.append(error.message);
        outputChannel.append('\n');
    }
}
export function findBlankInLineBegin(code: string, variableDeclarationLoc: Range[], document: vscode.TextDocument) {
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