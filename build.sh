	#!/bin/bash
	# ==========================================
	# v-scroll Build Script
	# Follows AGENTS.md Protocol
	# ==========================================
	set -e # 任何命令失败即终止脚本
	# 颜色定义
	GREEN='\033[0;32m'
	YELLOW='\033[1;33m'
	NC='\033[0m'
	echo -e "${GREEN}==> [1/3] Installing Dependencies (bun i)...${NC}"
	bun install
	echo -e "${GREEN}==> [2/3] Fixing Code Style...${NC}"
	# 根据 AGENTS.md 规范自动修复代码风格（合并 const、箭头函数等）
	# 使用 bunx 临时运行 biome，无需修改 package.json 依赖
	if bunx @biomejs/biome check --write . ; then
	    echo -e "${GREEN}Code style fixed.${NC}"
	else
	    echo -e "${YELLOW}Warning: Biome check failed or not configured. Skipping style fix.${NC}"
	fi
	echo -e "${GREEN}==> [3/3] Building Project (vite build)...${NC}"
	# 运行 package.json 中定义的 build 脚本
	bun run build
	echo -e "${GREEN}✅ Build successful!${NC}"