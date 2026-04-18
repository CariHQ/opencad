SHELL := bash
.ONESHELL:
.SHELLFLAGS := -euo pipefail -c

PROJECT     := opencad-prod
REGION      := us-central1
REGISTRY    := $(REGION)-docker.pkg.dev/$(PROJECT)/opencad
IMAGE_TAG   ?= $(shell git rev-parse --short HEAD)
SERVER_IMG  := $(REGISTRY)/opencad-server:$(IMAGE_TAG)
TF_DIR      := deploy/terraform
DIST        := packages/app/dist

.PHONY: help init import plan apply deploy build-server build-app \
        deploy-server deploy-landing deploy-app logs

help:
	@echo ""
	@echo "OpenCAD deployment targets"
	@echo "──────────────────────────────────────────────"
	@echo "  make init          Terraform init + install providers"
	@echo "  make import        Import existing GCP resources into state"
	@echo "  make plan          Preview infrastructure changes"
	@echo "  make apply         Apply infrastructure changes only"
	@echo "  make deploy        Full deploy: build + push + terraform apply"
	@echo "  make build-server  Build & push server Docker image"
	@echo "  make build-app     Build React app (packages/app/dist)"
	@echo "  make logs          Tail Cloud Run server logs"
	@echo ""

# ── Terraform ─────────────────────────────────────────────────────────────────

init:
	@# Create state bucket if it doesn't exist
	gcloud storage buckets create gs://opencad-tf-state \
	  --project=$(PROJECT) --location=US --uniform-bucket-level-access 2>/dev/null || true
	cd $(TF_DIR) && terraform init

import: init
	bash deploy/import.sh

plan: _require_tfvars
	cd $(TF_DIR) && terraform plan \
	  -var="server_image=$(SERVER_IMG)" \
	  -var="app_version=$(IMAGE_TAG)"

apply: _require_tfvars build-app
	cd $(TF_DIR) && terraform apply \
	  -var="server_image=$(SERVER_IMG)" \
	  -var="app_version=$(IMAGE_TAG)" \
	  -auto-approve

# ── Full deploy ───────────────────────────────────────────────────────────────

deploy: build-server build-app _require_tfvars
	cd $(TF_DIR) && terraform apply \
	  -var="server_image=$(SERVER_IMG)" \
	  -var="app_version=$(IMAGE_TAG)" \
	  -auto-approve

# ── Build targets ─────────────────────────────────────────────────────────────

build-server:
	gcloud auth configure-docker $(REGION)-docker.pkg.dev --quiet
	docker build --platform linux/amd64 -f server/Dockerfile -t $(SERVER_IMG) server/
	docker tag $(SERVER_IMG) $(REGISTRY)/opencad-server:latest
	docker push $(SERVER_IMG)
	docker push $(REGISTRY)/opencad-server:latest
	@echo "Pushed: $(SERVER_IMG)"

build-app:
	@echo "Reading Firebase config from Secret Manager..."
	$(eval VITE_FIREBASE_API_KEY            := $(shell gcloud secrets versions access latest --secret=opencad-firebase-api-key             --project=$(PROJECT) 2>/dev/null))
	$(eval VITE_FIREBASE_AUTH_DOMAIN        := $(shell gcloud secrets versions access latest --secret=opencad-firebase-auth-domain         --project=$(PROJECT) 2>/dev/null))
	$(eval VITE_FIREBASE_PROJECT_ID         := $(shell gcloud secrets versions access latest --secret=opencad-firebase-project-id          --project=$(PROJECT) 2>/dev/null))
	$(eval VITE_FIREBASE_STORAGE_BUCKET     := $(shell gcloud secrets versions access latest --secret=opencad-firebase-storage-bucket      --project=$(PROJECT) 2>/dev/null))
	$(eval VITE_FIREBASE_MESSAGING_SENDER_ID := $(shell gcloud secrets versions access latest --secret=opencad-firebase-messaging-sender-id --project=$(PROJECT) 2>/dev/null))
	$(eval VITE_FIREBASE_APP_ID             := $(shell gcloud secrets versions access latest --secret=opencad-firebase-app-id              --project=$(PROJECT) 2>/dev/null))
	VITE_FIREBASE_API_KEY='$(VITE_FIREBASE_API_KEY)' \
	VITE_FIREBASE_AUTH_DOMAIN='$(VITE_FIREBASE_AUTH_DOMAIN)' \
	VITE_FIREBASE_PROJECT_ID='$(VITE_FIREBASE_PROJECT_ID)' \
	VITE_FIREBASE_STORAGE_BUCKET='$(VITE_FIREBASE_STORAGE_BUCKET)' \
	VITE_FIREBASE_MESSAGING_SENDER_ID='$(VITE_FIREBASE_MESSAGING_SENDER_ID)' \
	VITE_FIREBASE_APP_ID='$(VITE_FIREBASE_APP_ID)' \
	pnpm build:browser
	@echo "Built: $(DIST)"

# ── Ops ───────────────────────────────────────────────────────────────────────

logs:
	gcloud run services logs read opencad-server \
	  --project=$(PROJECT) --region=$(REGION) --limit=100 --format=text

# ── Internal ──────────────────────────────────────────────────────────────────

_require_tfvars:
	@if [ ! -f "$(TF_DIR)/terraform.tfvars" ]; then \
	  echo ""; \
	  echo "ERROR: $(TF_DIR)/terraform.tfvars not found."; \
	  echo "Copy $(TF_DIR)/terraform.tfvars.example → $(TF_DIR)/terraform.tfvars"; \
	  echo "and fill in the values."; \
	  echo ""; \
	  exit 1; \
	fi
