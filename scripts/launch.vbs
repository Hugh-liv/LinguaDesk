Option Explicit

Dim shell, fso, root, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' This file lives in <project>\scripts; start the project root.
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = root
command = "node """ & root & "\scripts\launch.mjs"""
shell.Run command, 0, False
