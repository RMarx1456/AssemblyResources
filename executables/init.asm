;I/O
%DEFINE SYS_READ 0
%DEFINE STDIN 0
%DEFINE SYS_WRITE 1
%DEFINE STDOUT 1
;Process
%DEFINE SYS_CLONE 56

%DEFINE SYS_FORK 57
%DEFINE SYS_EXECVE 59
%DEFINE SYS_EXIT 60

%DEFINE SYS_PTRACE 101
%DEFINE PTRACE_TRACEME 0
%DEFINE PTRACE_SYSCALL 0x7
%DEFINE PTRACE_GETREGS 0xC

%DEFINE SYS_WAIT4 61



section .rodata
    exit_msg:
        .msg db 'Quitting assembly program.', 0xA
        .len equ $- .msg
    start_msg:
        .msg db 'Running init', 0xA
        .len equ $- .msg
section .data    
        
        
        child_pid db 0
        child_status db 0
    
section .bss
;Being lazy here; I need to get this project done.
path resb 4096
args resb 4096
env resb 4096

regs:
        ._R15 resq 1
        ._R14 resq 1
        ._R13 resq 1   
        ._R12 resq 1
        ._RBP resq 1
        ._RBX resq 1
        ._R11 resq 1
        ._R10 resq 1
        ._R9 resq 1
        ._R8 resq 1
        ._RAX resq 1
        ._RCX resq 1
        ._RDX resq 1
        ._RSI resq 1
        ._RDI resq 1
        .orig_rax resq 1
        ._RIP resq 1
        ._CS resq 1
        ._EFLAGS resq 1
        ._RSP resq 1
        ._SS resq 1
        .fs_base resq 1
        .gs_base resq 1
        ._DS resq 1
        ._ES resq 1
        ._FS resq 1
        ._GS resq 1
        .identifier resd 1
        .len equ $- regs
section .text
global _start
child:
    ;Allows the parent process to trace this child process.
    MOV RAX, SYS_PTRACE
    MOV RDI, PTRACE_TRACEME
    XOR RSI, RSI
    XOR RDX, RDX
    SYSCALL
    
    MOV RAX, SYS_EXECVE
    MOV RDI, path
    MOV RSI, args
    MOV RDX, env
    SYSCALL

_start:
    MOV EAX, 'regs'
    MOV [regs.identifier], EAX
    
    MOV RAX, SYS_WRITE
    MOV RDI, STDOUT
    MOV RSI, start_msg.msg
    MOV RDX, start_msg.len
    SYSCALL
    ;Read path from app.
    MOV RAX, SYS_READ
    MOV RDI, STDIN
    MOV RSI, path
    MOV RDX, 4096
    SYSCALL
    ;Read args from app.
    MOV RAX, SYS_READ
    MOV RDI, STDIN
    MOV RSI, args
    MOV RDX, 4096
    SYSCALL
    ;Read env from app.
    MOV RAX, SYS_READ
    MOV RDI, STDIN
    MOV RSI, env
    MOV RDX, 4096
    SYSCALL
    ;Create child process.
    MOV RAX, SYS_FORK
    SYSCALL
    
    CMP RAX, 0
    JE child
    MOV [child_pid], RAX
    ;Wait for stops to gather syscall info.
    wait_loop:
        MOV RAX, SYS_WAIT4
        MOV RDI, [child_pid]
        MOV RSI, child_status
        XOR RDX, RDX
        SYSCALL
        ;Trace syscalls
        MOV RAX, SYS_PTRACE
        MOV RDI, PTRACE_SYSCALL
        MOV RSI, [child_pid]
        XOR RDX, RDX
        SYSCALL
        ;Pull register info on syscall.
        MOV RAX, SYS_PTRACE
        MOV RDI, PTRACE_GETREGS
        MOV RSI, [child_pid]
        MOV RDX, regs
        SYSCALL
        
        MOV RAX, SYS_WRITE
        MOV RDI, STDOUT
        MOV RSI, regs
        MOV RDX, regs.len
        SYSCALL
        
        MOV RAX, regs._RAX
        
        CMP RAX, 60
        JE quit
        JMP wait_loop
        
    quit:
        MOV RAX, SYS_WRITE
        MOV RDI, STDOUT
        MOV RSI, exit_msg.msg
        MOV RDX, exit_msg.len
        SYSCALL
        
        MOV RAX, SYS_EXIT
        XOR RDI, RDI
        SYSCALL
