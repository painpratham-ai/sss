import json

log_path = 'C:/Users/HP/.gemini/antigravity-ide/brain/bd9c24e8-518e-4c06-989e-c9aa2180b216/.system_generated/logs/transcript.jsonl'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('step_index') == 364:
            with open('scripts/features-proposal.txt', 'w', encoding='utf-8') as out:
                out.write(data.get('content'))
            print("Successfully written to scripts/features-proposal.txt")
            break
