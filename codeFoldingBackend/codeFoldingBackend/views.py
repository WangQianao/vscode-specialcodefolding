from django.http import JsonResponse
import torch.nn as nn
import torch
from transformers import AutoTokenizer, RobertaConfig, RobertaModel
import json
from captum.attr import LayerIntegratedGradients, TokenReferenceBase
import numpy as np
from . import model

source_length = 64
target_length = 64
beam_size = 10
output_dir = f"model\javascript"
pretrained_model = "microsoft/codebert-base"

tokenizer = AutoTokenizer.from_pretrained(pretrained_model)
config = RobertaConfig.from_pretrained(pretrained_model)
encoder = RobertaModel.from_pretrained(pretrained_model, config=config)
decoder_layer = nn.TransformerDecoderLayer(d_model=config.hidden_size, nhead=config.num_attention_heads)
decoder = nn.TransformerDecoder(decoder_layer, num_layers=6)
trained_model = model.Seq2Seq(encoder=encoder, decoder=decoder, config=config,
                beam_size=beam_size, max_length=target_length,
                sos_id=tokenizer.cls_token_id, eos_id=tokenizer.sep_token_id)
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
trained_model.load_state_dict(torch.load("codeFoldingBackend\\model\\javascript\\checkpoint-best-bleu\\pytorch_model.pt"))
trained_model.to("cuda")

class InputFeatures(object):
    """A single training/test features for a example."""

    def __init__(self,
                 example_id,
                 source_ids,
                 target_ids,
                 source_mask,
                 target_mask,

                 ):
        self.example_id = example_id
        self.source_ids = source_ids
        self.target_ids = target_ids
        self.source_mask = source_mask
        self.target_mask = target_mask


class Example(object):
    """A single training/test example."""
    def __init__(self,
                 idx,
                 source,
                 target,
                 ):
        self.idx = idx
        self.source = source
        self.target = target


def convert_examples_to_features(examples, tokenizer, args, stage=None):
    features = []
    for example_index, example in enumerate(examples):
        # source
        source_tokens = tokenizer.tokenize(example.source)[:args.max_source_length - 2]
        source_tokens = [tokenizer.cls_token] + source_tokens + [tokenizer.sep_token]
        source_ids = tokenizer.convert_tokens_to_ids(source_tokens)
        source_mask = [1] * (len(source_tokens))
        padding_length = args.max_source_length - len(source_ids)
        source_ids += [tokenizer.pad_token_id] * padding_length
        source_mask += [0] * padding_length

        # target
        if stage == "test":
            target_tokens = tokenizer.tokenize("None")
        else:
            target_tokens = tokenizer.tokenize(example.target)[:args.max_target_length - 2]
        target_tokens = [tokenizer.cls_token] + target_tokens + [tokenizer.sep_token]
        target_ids = tokenizer.convert_tokens_to_ids(target_tokens)
        target_mask = [1] * len(target_ids)
        padding_length = args.max_target_length - len(target_ids)
        target_ids += [tokenizer.pad_token_id] * padding_length
        target_mask += [0] * padding_length
        features.append(
            InputFeatures(
                example_index,
                source_ids,
                target_ids,
                source_mask,
                target_mask,
            )
        )
    return features



class Args:
    max_source_length = source_length
    max_target_length = target_length

args = Args()

def prep_input(method):
    examples = [
        Example(0, source = method, target = "")
    ]
    eval_features = convert_examples_to_features(
        examples, tokenizer, args, stage="test"
    )
    source_ids = torch.tensor(
        eval_features[0].source_ids, dtype = torch.long
    ).unsqueeze(0).to("cuda")
    source_mask = torch.tensor(
        eval_features[0].source_mask, dtype = torch.long
    ).unsqueeze(0).to("cuda")

    return source_ids, source_mask

def gen_comment(method):
    source_ids, source_mask = prep_input(method)
    with torch.no_grad():
        pred = trained_model(source_ids = source_ids, source_mask = source_mask)[0]
        t = pred[0].cpu().numpy()
        t = list(t)
        if 0 in t:
            t = t[:t.index(0)]
        text = tokenizer.decode(t,clean_up_tokenization_spaces=False)
        return text

def squad_pos_forward_func(source_ids, source_mask=None):
    outputs = trained_model.encoder(source_ids, attention_mask=source_mask)
    encoder_output = outputs[0].permute([1, 0, 2]).contiguous()
    final_output = encoder_output.sum(2)
    pred=final_output.max(0).values
    return pred

token_reference = TokenReferenceBase(reference_token_idx=tokenizer.pad_token_id)
lig = LayerIntegratedGradients(squad_pos_forward_func,trained_model.encoder.embeddings.word_embeddings)
vis_data_records_ig = []


def interpret_sentence(sentence, min_len=128, label=0):
    source_ids, source_mask = prep_input(sentence)
    source_tokens = tokenizer.tokenize(sentence)[:args.max_source_length - 2]
    reference_indices = token_reference.generate_reference(min_len, device=device).unsqueeze(0)
    attributions_ig, delta = lig.attribute(source_ids, reference_indices,additional_forward_args=source_mask,
                                            n_steps=2, return_convergence_delta=True)
    attributions_ig=attributions_ig.sum(2)
    attributions_ig=attributions_ig.cpu().numpy()
    source_ids=source_ids.cpu().numpy()
    index=np.where(source_ids==1)[1][0]
    return source_tokens,attributions_ig[0][1:index-1]
def hello(request):
    if(request.method=='POST'):
        post_body=request.body
        json_param = json.loads(post_body.decode())
        if json_param:
            method = json_param.get('code', 0)

            a = gen_comment(method)
        source_tokens,attributions_ig=interpret_sentence(method, min_len=source_length, label=0)
        attributions_ig=list(attributions_ig)
        token_index=list()
        temp_str = ''
        for i in method:
            if ord(i) == 32:
                temp_str += 'Ġ'
            elif ord(i) == 13:
                temp_str += 'č'
            elif ord(i) == 10:
                temp_str += 'Ċ'
            else:
                temp_str += i
        j=0
        for token in source_tokens:
            pos=temp_str.find(token,j)
            if(pos!=-1):
                j+=len(token)
                token_index.append(j)
        data = {
            'summary': a,
            'attribution': attributions_ig,
            "token_index":token_index
        }
    return JsonResponse(data)


