import json

log_path = 'C:/Users/HP/.gemini/antigravity-ide/brain/bd9c24e8-518e-4c06-989e-c9aa2180b216/.system_generated/logs/transcript.jsonl'
keywords = ['latex', 'leaderboard', 'streaks', 'numerical solver', 'concept-map', 'compliance score', 'evaluator']

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        content = data.get('content', '')
        if any(kw in content.lower() for kw in keywords):
            print("Step:", data.get('step_index'))
            # Print matching lines containing the keywords
            for l in content.split('\n'):
                if any(kw in l.lower() for kw in keywords):
                    print("  Match:", l[:120])
            print("="*40)
