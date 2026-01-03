# -*- mode: python ; coding: utf-8 -*-

"""
PyInstaller spec file for ForgeEngine standalone executable.

Per spec FR-023: Single executable with bundled Playwright and Chrome.
"""

import os
import sys

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Collect Playwright data files
datas = collect_data_files('playwright')

# Collect additional data
datas += [
    ('backend/engine/config.py', '.'),
    ('backend/engine/models', 'models'),
    ('backend/engine/database', 'database'),
]

# Collect all submodules
hiddenimports = collect_submodules('playwright')
hiddenimports += [
    'playwright.async_api',
    'uvicorn',
    'fastapi',
    'pydantic',
    'sqlalchemy',
    'aiosqlite',
    'httpx',
]

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='forgeengine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
