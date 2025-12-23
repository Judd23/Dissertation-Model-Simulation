# Process-SEM Monte Carlo Study

A comprehensive workspace for conducting Monte Carlo simulation studies for Structural Equation Modeling (SEM) and process models.

## Features

- 🎲 **Flexible Monte Carlo Framework**: Easily configurable simulation engine
- 📊 **Statistical Analysis**: Automatic computation of bias, MSE, coverage rates, and power
- 📈 **Visualization Tools**: Built-in plotting functions for parameter distributions and convergence
- ⚙️ **Configuration Management**: YAML-based configuration for easy parameter adjustment
- 🧪 **Testing Suite**: Comprehensive unit tests for reliability
- 📝 **Results Export**: CSV, JSON, and LaTeX output formats

## Project Structure

```
Process-SEM/
├── process_sem/                # Python package
│   ├── __init__.py
│   ├── monte_carlo.py          # Main simulation engine
│   └── utils.py                # Utility functions
├── config/                     # Configuration files
│   └── simulation_config.yaml  # Simulation parameters
├── results/                    # Output directory (generated; ignored by git)
├── tests/                      # Unit tests
│   └── test_simulation.py
├── scripts/                    # Entry points + helpers
│   ├── run_simulation.py       # Main Python execution script
│   └── generate_fake_data.py
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Process-SEM
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Quick Start

### Basic Usage

Run a Monte Carlo simulation with default settings:

```bash
python3 scripts/run_simulation.py
```

## R scripts (lavaan WLSMV Monte Carlo)

This repo also includes R scripts (in `r/mc/`) for Monte Carlo studies using **lavaan** with categorical indicators (WLSMV).

### R package version guard (reproducibility)

For the next steps in this workflow, make sure your R environment is using a sufficiently recent `lavaan`.
This workspace is currently tested with `lavaan >= 0.6-21`.

In any script where you want to hard-lock the requirement, you can add:

```r
stopifnot(packageVersion("lavaan") >= "0.6-21")
```

If you need to upgrade:

```r
install.packages("lavaan")
```

### PSW overlap weights (pre-processing stage)

If you're estimating propensity score overlap weights outside the simulation, use:

- `scripts/01_psw_stage.R`
    (If you keep a PSW pre-processing script, consider placing it under `r/` as well.)

It reads an analysis-ready CSV, fits a logistic PS model, computes **overlap weights**
$w_i = 1-\hat p_i$ for treated and $w_i = \hat p_i$ for controls, then scales weights to have mean 1.

Inputs (expected columns):

- `X` (0/1 treatment indicator)
- the covariates in the PS formula (edit in the script to match your paper)

Outputs:

- a CSV with `id` and `psw` (and optional `ps_hat`)

Example:

```bash
Rscript scripts/01_psw_stage.R \
    --in data/analysis.csv \
    --out data/weights_psw.csv \
    --id id \
    --keep_ps 1
```

### Johnson–Neyman plots (quick, from saved rep outputs)

If you run the R Monte Carlo with `--save_fits 1`, the repo writes per-rep text outputs like:

- `results/lavaan/<run_id>/rep099_pooled.txt`

You can generate **Johnson–Neyman (J-N)** plots for the moderated path (the conditional effect of `X` on `M1` as a function of the centered moderator `credit_dose_c`) without re-fitting anything.

Single rep:

```bash
Rscript r/plots/02_compute_jn_from_rep.R \
    --rep_file results/lavaan/<run_id>/rep099_pooled.txt \
    --out_dir results/plots \
    --zmin -2 --zmax 2
```

Batch mode (many reps from a run directory):

```bash
Rscript r/plots/02_compute_jn_from_rep.R \
    --run_dir results/lavaan/<run_id> \
    --reps 91:99 \
    --out_dir results/plots \
    --prefix pooled \
    --zmin -2 --zmax 2
```

Notes:

- This is an **approximate** J-N calculation based on the saved coefficient estimates and SEs; it ignores the covariance between the interaction terms (because we’re parsing text output, not a stored vcov matrix).
- Outputs are written as PNG + CSV curve files in `results/plots/`.

### Optional: multiple imputation (MI) for pooled SEM

If you want to handle missingness via multiple imputation, a workable pattern is:

1) impute with `mice`
2) fit the pooled SEM across imputations with `semTools::runMI()`
3) recompute derived terms like `credit_dose_c` and `XZ_c` inside the analysis function (don’t impute them directly)

Packages needed (install once in your R environment):

- `lavaan`
- `mice`
- `semTools`

Note on missing data (study policy):

- This repo is set up to **avoid pairwise deletion**.
- With **WLSMV + ordered indicators**, `lavaan` does not do FIML; the safe default is **listwise** deletion.
- If you want to keep cases under missingness with ordinal indicators, use **multiple imputation** (`mice` + `semTools::runMI()`).

Example (pooled model; assumes `dat`, `ORDERED_VARS`, and `build_model_pooled()` exist in your session):

```r
library(mice)
library(semTools)
library(lavaan)

vars_for_mi <- unique(c(
    ORDERED_VARS,
        "X","credit_dose",
    "hgrades","bparented","pell","hapcl","hprecalc13","hchallenge","cSFcareer","cohort",
    "re_all","firstgen","living18","sex"
))

dat_mi <- dat[, vars_for_mi]

# Ensure ordered vars are ordered factors
for (v in ORDERED_VARS) dat_mi[[v]] <- as.ordered(dat_mi[[v]])

meth <- make.method(dat_mi)
meth[ORDERED_VARS] <- "polr"
meth[c("hgrades","bparented","hchallenge","cSFcareer","credit_dose")] <- "pmm"
meth[c("X","pell","hapcl","hprecalc13","firstgen","cohort")] <- "logreg"
meth[c("re_all","living18","sex")] <- "polyreg"  # or set to "" to not impute

pred <- make.predictorMatrix(dat_mi)
diag(pred) <- 0

imp <- mice(dat_mi, m = 30, method = meth, predictorMatrix = pred,
                        maxit = 20, seed = 123)

fit_fun <- function(data) {
        zbar <- mean(data$credit_dose, na.rm = TRUE)
        data$credit_dose_c <- as.numeric(scale(data$credit_dose, center = TRUE, scale = FALSE))
        data$XZ_c <- data$X * data$credit_dose_c

    lavaan::sem(
        model = build_model_pooled(zbar = zbar),
        data = data,
        ordered = ORDERED_VARS,
        estimator = "WLSMV",
        parameterization = "theta"
    )
}

fit_mi <- runMI(data = imp, fun = fit_fun)
summary(fit_mi, standardized = TRUE, fit.measures = TRUE)
```

### Custom Configuration

Edit `config/simulation_config.yaml` to customize simulation parameters:

```yaml
n_simulations: 1000      # Number of Monte Carlo iterations
sample_size: 200         # Sample size for each iteration
random_seed: 42          # Random seed for reproducibility
n_variables: 5           # Number of variables
base_correlation: 0.3    # Base correlation between variables
```

### Python API

Use the Monte Carlo simulator in your own scripts:

```python
from src.monte_carlo import MonteCarloSimulator, SimulationConfig
from src.utils import create_summary_table

# Configure simulation
config = SimulationConfig(
    n_simulations=1000,
    sample_size=200,
    random_seed=42
)

# Create simulator
simulator = MonteCarloSimulator(config)

# Run simulation
results_df = simulator.run(
    data_generator=your_data_generator,
    estimator=your_estimator
)

# Analyze results
summary = simulator.compute_summary_statistics(results_df)
summary_table = create_summary_table(results_df, true_values)
```

## Custom Data Generators and Estimators

### Data Generator

Define a function that generates synthetic data:

```python
def my_data_generator(sample_size: int, **params) -> np.ndarray:
    """
    Generate synthetic data for one simulation iteration.
    
    Args:
        sample_size: Number of observations
        **params: Additional parameters
        
    Returns:
        Generated data as numpy array
    """
    # Your data generation logic here
    return data
```

### Estimator

Define a function that estimates model parameters:

```python
def my_estimator(data: np.ndarray, **params) -> Dict:
    """
    Estimate model parameters from data.
    
    Args:
        data: Input data
        **params: Additional parameters
        
    Returns:
        Dictionary with 'converged', 'parameters', 'standard_errors', 'fit_indices'
    """
    # Your estimation logic here
    return {
        'converged': True,
        'parameters': {...},
        'standard_errors': {...},
        'fit_indices': {...}
    }
```

## Output Files

After running a simulation, the following files are generated:

- `results/monte_carlo_results.csv`: Raw simulation results
- `results/summary_statistics.json`: Aggregated summary statistics
- `results/summary_table.csv`: Formatted summary table
- `results/plots/parameter_distributions.png`: Parameter distribution plots
- `results/plots/convergence_*.png`: Convergence plots

## Statistical Measures

The framework automatically computes:

- **Bias**: Mean(estimates) - true_value
- **Relative Bias**: (Bias / true_value) × 100%
- **MSE**: Mean squared error
- **Coverage**: Proportion of confidence intervals containing true value
- **Power**: Rejection rate at specified α level
- **Standard Error**: Standard deviation of estimates

## Testing

Run the test suite:

```bash
pytest tests/test_simulation.py -v
```

Or using Python:

```bash
python tests/test_simulation.py
```

## Examples

### Example 1: Simple Correlation Study

```python
from src.monte_carlo import example_data_generator, example_estimator

results = simulator.run(
    data_generator=example_data_generator,
    estimator=example_estimator,
    n_variables=3,
    correlation=0.5
)
```

### Example 2: Custom SEM Model

```python
def sem_data_generator(sample_size, **params):
    # Define structural model
    # Y = β*X + ε
    beta = params.get('beta', 0.5)
    X = np.random.randn(sample_size)
    Y = beta * X + np.random.randn(sample_size)
    return np.column_stack([X, Y])

def sem_estimator(data, **params):
    X, Y = data[:, 0], data[:, 1]
    beta_hat = np.cov(X, Y)[0, 1] / np.var(X)
    se_beta = np.sqrt((1 - beta_hat**2) / len(X))
    
    return {
        'converged': True,
        'parameters': {'beta': beta_hat},
        'standard_errors': {'beta': se_beta},
        'fit_indices': {'r_squared': beta_hat**2}
    }
```

## Visualization

The framework includes several plotting functions:

- `plot_parameter_distributions()`: Histogram and density plots
- `plot_convergence_over_iterations()`: Cumulative mean convergence
- Custom plots can be created using the results DataFrame

## Performance Tips

- Use `parallel=True` in SimulationConfig for large studies (requires joblib)
- Set `save_intermediate=True` to save progress periodically
- Adjust `sample_size` and `n_simulations` based on computational resources
- Use `random_seed` for reproducibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Citation

If you use this code in your research, please cite:

```bibtex
@software{process_sem_mc,
  title={Process-SEM Monte Carlo Study Framework},
  author={Your Name},
  year={2025},
  url={https://github.com/yourusername/Process-SEM}
}
```

## Contact

For questions or issues, please open an issue on GitHub or contact [your email].

## Acknowledgments

This framework was developed to facilitate Monte Carlo simulation studies for structural equation modeling and process analysis research.