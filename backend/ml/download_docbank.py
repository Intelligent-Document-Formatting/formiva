from datasets import load_dataset

print("=" * 60)
print("LOADING DOCBANK - CONTROLLED SUBSET")
print("=" * 60)

dataset = load_dataset(
    "maveriq/DocBank",
    split="train[:5000]"
)

print("\n" + "=" * 60)
print("DOCKBANK LOADED SUCCESSFULLY")
print("=" * 60)

print(f"Number of pages: {len(dataset)}")

print("\nDataset features:")
print(dataset.features)

print("\nFirst sample:")
print(dataset[0])