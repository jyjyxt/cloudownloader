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
  return `# Bash completion for cloudl
# Add to ~/.bashrc:  eval "$(cloudl completion bash)"
_cloudl_completions() {
  local cur words cword
  _get_comp_words_by_ref -n : cur words cword

  local completions
  completions=$(cloudl --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)

  COMPREPLY=( $(compgen -W "$completions" -- "$cur") )
  __ltrim_colon_completions "$cur"
}
complete -F _cloudl_completions cloudl
`;
}

export function zshCompletionScript(): string {
  return `# Zsh completion for cloudl
# Add to ~/.zshrc:  eval "$(cloudl completion zsh)"
_cloudl() {
  local -a completions
  local cword=$((CURRENT - 1))
  completions=(\${(f)"$(cloudl --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)"})
  compadd -a completions
}
compdef _cloudl cloudl
`;
}

export function fishCompletionScript(): string {
  return `# Fish completion for cloudl
# Add to ~/.config/fish/config.fish:  cloudl completion fish | source
complete -c cloudl -f -a '(
  set -l tokens (commandline -cop)
  set -l cursor (count (commandline -cop))
  cloudl --get-completions --cursor $cursor $tokens[2..] 2>/dev/null
)'
`;
}
