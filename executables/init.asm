;I/O
%DEFINE SYS_READ 0
%DEFINE STDIN 0
%DEFINE SYS_WRITE 1
%DEFINE STDOUT 1
;Process
%DEFINE SYS_CLONE 56
;Flags
%DEFINE CLONE_VM 0x0100
%DEFINE CLONE_SIGHAND 0x0800
%DEFINE CLONE_THREAD 0x00010000

%DEFINE SYS_FORK 57
%DEFINE SYS_EXIT 60
%DEFINE SYS_PTRACE 101




section .rodata

section .data    
    regs:
        ._R15: resq 1
        ._R14: resq 1
        ._R13: resq 1   
        ._R12: resq 1
        ._RBP: resq 1
        ._RBX: resq 1
        ._R11: resq 1
        ._R10: resq 1
        ._R9: resq 1
        ._R8: resq 1
        ._RAX: resq 1
        ._RCX: resq 1
        ._RDX: resq 1
        ._RSI: resq 1
        ._RDI: resq 1
        .orig_rax: resq 1
        ._RIP: resq 1
        ._CS: resq 1
        ._EFLAGS: resq 1
        ._RSP: resq 1
        ._SS: resq 1
        .fs_base: resq 1
        .gs_base: resq 1
        ._DS: resq 1
        ._ES: resq 1
        ._FS: resq 1
        ._GS: resq 1
        
         
    
    
section .text
global _start

_start:

