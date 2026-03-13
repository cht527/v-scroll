	#!/bin/bash
	# ==========================================
	# v-scroll Build Pipeline
	# 遵循 AGENTS.md 规范
	# ==========================================
	set -e # 任何命令失败立即终止
	GREEN='\033[0;32m'
	RED='\033[0;31m'
	YELLOW='\033[1;33m'
	NC='\033[0m'
	echo -e "${GREEN}[1/3] Installing Dependencies...${NC}"
	bun install
	echo -e "${GREEN}[2/3] Checking Code Standards...${NC}"
	# 这里的 --write 会自动修复格式（如引号、分号）
	# 但对于命名规范等错误，只能报错提示 AI 修正
	bunx biome check --write . || {
	    echo -e "${RED}❌ Code standards check failed!${NC}"
	    echo -e "${YELLOW}Please check naming conventions and syntax rules defined in AGENTS.md${NC}"
	    exit 1
	}
	echo -e "${GREEN}[3/3] Building Project...${NC}"
	bunx vite build
	echo -e "${GREEN}✅ Build successful!${NC}"