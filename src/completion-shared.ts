/**
 * Shared constants and shell script generators for tab-completion.
 *
 * This module MUST remain lightweight (no registry, no discovery imports).
 * Both completion.ts (full path) and completion-fast.ts (manifest path) import from here.
 */

/**
 * Built-in (non-dynamic) top-level commands.
 */
export const BUILTIN_COMMANDS = [
  'list',
  'validate',
  'verify',
  'auth',
  'browser',
  'tab',
  'doctor',
  'plugin',
  'external',
  'completion',
];

// ── Shell script generators ────────────────────────────────────────────────

export function bashCompletionScript(): string {
  return `# Bash completion for ClouDownloader
# Add to ~/.bashrc:  eval "$(ClouDownloader completion bash)"
_ClouDownloader_completions() {
  local cur words cword
  _get_comp_words_by_ref -n : cur words cword

  local completions
  completions=$(ClouDownloader --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)

  COMPREPLY=( $(compgen -W "$completions" -- "$cur") )
  __ltrim_colon_completions "$cur"
}
complete -F _ClouDownloader_completions ClouDownloader
`;
}

export function zshCompletionScript(): string {
  return `# Zsh completion for ClouDownloader
# Add to ~/.zshrc:  eval "$(ClouDownloader completion zsh)"
_ClouDownloader() {
  local -a completions
  local cword=$((CURRENT - 1))
  completions=(\${(f)"$(ClouDownloader --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)"})
  compadd -a completions
}
compdef _ClouDownloader ClouDownloader
`;
}

export function fishCompletionScript(): string {
  return `# Fish completion for ClouDownloader
# Add to ~/.config/fish/config.fish:  ClouDownloader completion fish | source
complete -c ClouDownloader -f -a '(
  set -l tokens (commandline -cop)
  set -l cursor (count (commandline -cop))
  ClouDownloader --get-completions --cursor $cursor $tokens[2..] 2>/dev/null
)'
`;
}
