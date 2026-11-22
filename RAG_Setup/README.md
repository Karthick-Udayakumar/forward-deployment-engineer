# Testleaf FDE — Four Chunking Strategies (Learner Lab)


## 1 — Set up on macOS or Windows

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Windows (PowerShell or Command Prompt)

Use **64-bit Python 3.11**. Check Python from PowerShell or Command Prompt:

```powershell
python --version
```

Open the **extracted** `Chunking_Lab` folder in PowerShell or Command Prompt. Create a virtual environment, then use its Python directly; **no activation is required**, so PowerShell execution-policy restrictions do not interfere:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python RAG_Setup/chunking_lab.py --file RAG_Setup/sample_policy.md --method fixed  
python RAG_Setup/chunking_lab.py --file RAG_Setup/sample_policy.md --method recursive
python RAG_Setup/chunking_lab.py --file RAG_Setup/sample_policy.md --method structure
python RAG_Setup/chunking_lab.py --file RAG_Setup/sample_policy.md --method semantic

```


**Windows-specific cautions:** Corporate proxies or antivirus software can interfere with dependency/model downloads; network access is needed on the first semantic run. Semantic chunking may download large PyTorch dependencies and the embedding model, so teachers can begin with fixed, recursive and structure-aware chunking. The supplied Python code uses `pathlib` for cross-platform paths; full dependency execution still needs checking on a Windows PC.

### First-time model setup (both systems)

**First-time setup:** The semantic splitter downloads the embedding model `BAAI/bge-small-en-v1.5` from Hugging Face if not already cached. It does not require an OpenAI API key. For a computer without internet or insufficient model dependencies, run the other three methods first.

## 3 — Run the demonstration

```bash
python chunking_lab.py --file sample_policy.md --method fixed
python chunking_lab.py --file sample_policy.md --method recursive
python chunking_lab.py --file sample_policy.md --method structure
python chunking_lab.py --file sample_policy.md --method semantic
```

Or run all at once:

```bash
python chunking_lab.py --file sample_policy.md
```

The terminal shows each chunk's complete text and character count, along with any header metadata. JSON results are saved under `chunking_results/` for comparison.

## 4 — Change one variable, observe the effect

```bash
# Smaller fixed/recursive chunks
python chunking_lab.py --file sample_policy.md --method recursive --chunk-size 120 --overlap 20

# Larger fixed/recursive chunks
python chunking_lab.py --file sample_policy.md --method recursive --chunk-size 450 --overlap 40

# Change what constitutes a semantic jump (threshold percentile)
python chunking_lab.py --file sample_policy.md --method semantic --semantic-percentile 85
```

Overlapping chunks repeat a portion of the previous chunk. This sometimes helps with boundary context but creates duplication. For structure-aware chunking, modify Markdown headings and rerun. For semantic chunking, compare boundaries before and after changing the percentile.


