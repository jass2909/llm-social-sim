import json
import time
import requests
import os
import random
import uuid
import sys

COMFY = "http://127.0.0.1:8000"
WORKFLOW_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "imgg.json")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generatedImg")

POS_NODE = "16"  # positive prompt node id
NEG_NODE = "40"  # negative prompt node id
SEED_NODE = "3"  # KSampler node id

def wait_for_comfy():
    try:
        print(f"Checking connection to ComfyUI at {COMFY}...")
        r = requests.get(f"{COMFY}/system_stats", timeout=5)
        r.raise_for_status()
        print("ComfyUI is reachable.")
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Could not connect to ComfyUI at {COMFY}.")
        print("Please ensure that:")
        print("1. ComfyUI is running.")
        print("2. It is listening on port 8000 (default).")
        print("3. There are no firewalls blocking the connection.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] check failed: {e}")
        sys.exit(1)

def generate_image(prompt_text: str, negative_text: str = "text, watermark, logo, blurry"):
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Randomize seed
    workflow[SEED_NODE]["inputs"]["seed"] = random.randint(1, 10**14)

    # Prompt inject
    workflow[POS_NODE]["inputs"]["text"] = prompt_text
    workflow[NEG_NODE]["inputs"]["text"] = negative_text

    # Start generation
    r = requests.post(f"{COMFY}/prompt", json={"prompt": workflow}, timeout=30)
    r.raise_for_status()
    prompt_id = r.json()["prompt_id"]

    # Poll until done
    while True:
        h = requests.get(f"{COMFY}/history/{prompt_id}", timeout=30).json()
        if prompt_id in h:
            break
        time.sleep(0.2)

    # Find first image output
    if "outputs" not in h[prompt_id]:
        raise RuntimeError(f"Generation failed. No outputs in history for prompt {prompt_id}. Check ComfyUI logs.")
    outputs = h[prompt_id]["outputs"]
    img = None
    for node_out in outputs.values():
        if "images" in node_out and node_out["images"]:
            img = node_out["images"][0]
            break
    if not img:
        raise RuntimeError("No image output found. Ensure workflow ends with SaveImage node.")

    # Download image bytes
    img_bytes = requests.get(
        f"{COMFY}/view",
        params={
            "filename": img["filename"],
            "subfolder": img.get("subfolder", ""),
            "type": img.get("type", "output"),
        },
        timeout=60
    ).content

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    filename = f"img_{uuid.uuid4().hex}.png"
    out_path = os.path.join(OUTPUT_DIR, filename)
    with open(out_path, "wb") as f:
        f.write(img_bytes)

    return out_path

if __name__ == "__main__":
    wait_for_comfy()
    path = generate_image("a person with a coffee cup, white background")
    print("saved:", path)
