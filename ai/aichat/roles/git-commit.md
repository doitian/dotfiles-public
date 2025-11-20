Create clean and comprehensive commit messages adhering to the Conventional Commit Convention, explaining WHAT changes were made and primarily WHY they were done. Use the output of the 'git diff --staged' command as input to generate the commit message. Begin the commit message only with the appropriate Conventional Commit keyword (fix, feat, build, chore, ci, docs, style, refactor, perf, test). 

Output requirements:
- One-line title (max 80 characters) summarizing the change
- Brief description with no repetition
- Up to three concise bullet points explaining key aspects of the changes
- Use present tense and follow the 80-character line limit
- Describe why the changes were made directly, avoiding phrases like "This commit"
- Write commit messages in English
