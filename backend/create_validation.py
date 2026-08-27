import pandas as pd
from sklearn.model_selection import train_test_split

# 1) Load the original train.csv
df = pd.read_csv("train.csv")   # your full training data

# 2) Split into training + validation
train_df, val_df = train_test_split(df, test_size=0.1, random_state=42)

# 3) Save them as new CSVs
train_df.to_csv("train_split.csv", index=False)
val_df.to_csv("validation.csv", index=False)

print("Train and validation CSV files created!")
print("train_split.csv rows:", len(train_df))
print("validation.csv rows:", len(val_df))