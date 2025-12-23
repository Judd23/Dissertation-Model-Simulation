"""
Unit tests for Monte Carlo simulation modules
"""

import sys
from pathlib import Path

# Make project modules importable for local runs without requiring an editable install.
# Imports come from the packaged module `process_sem/`.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import numpy as np
import pytest
from process_sem.monte_carlo import (
    MonteCarloSimulator,
    SimulationConfig,
    example_data_generator,
    example_estimator
)
from process_sem.utils import (
    calculate_bias,
    calculate_mse,
    calculate_coverage,
    generate_correlation_matrix
)

EPS = 1e-12


def test_simulation_config():
    """Test SimulationConfig initialization"""
    config = SimulationConfig(n_simulations=100, sample_size=50)
    assert config.n_simulations == 100
    assert config.sample_size == 50
    assert config.random_seed == 42  # default


def test_monte_carlo_simulator_init():
    """Test MonteCarloSimulator initialization"""
    config = SimulationConfig(n_simulations=10, sample_size=30)
    simulator = MonteCarloSimulator(config)
    assert simulator.config.n_simulations == 10
    assert len(simulator.results) == 0


def test_data_generator():
    """Test example data generator"""
    np.random.seed(42)
    data = example_data_generator(sample_size=100, n_variables=3, correlation=0.5)
    
    assert data.shape == (100, 3)
    assert not np.isnan(data).any()
    assert not np.isinf(data).any()
    # Basic sanity: each variable should vary.
    assert np.all(np.var(data, axis=0) > 0)


def test_estimator():
    """Test example estimator"""
    np.random.seed(42)
    data = np.random.randn(100, 3)
    results = example_estimator(data)
    
    assert results.get('converged') is True
    assert 'parameters' in results
    assert 'standard_errors' in results
    assert 'fit_indices' in results

    # Basic shape/type sanity (without over-assuming estimator internals)
    assert isinstance(results['fit_indices'], dict)


def test_monte_carlo_run():
    """Test full Monte Carlo simulation run"""
    config = SimulationConfig(n_simulations=5, sample_size=50, random_seed=42)
    simulator = MonteCarloSimulator(config)
    
    results_df = simulator.run(
        data_generator=example_data_generator,
        estimator=example_estimator,
        n_variables=2,
        correlation=0.5
    )
    
    assert 'iteration' in results_df.columns
    # Expect one record per requested simulation (if run() is designed to drop failures,
    # it should still record them with a status flag rather than silently omitting).
    assert len(results_df) == config.n_simulations

    iters = results_df['iteration'].to_numpy()
    assert len(np.unique(iters)) == config.n_simulations
    # Allow either 0..n-1 or 1..n as iteration schemes.
    assert set(iters) in (set(range(config.n_simulations)), set(range(1, config.n_simulations + 1)))


def test_calculate_bias():
    """Test bias calculation"""
    estimates = np.array([1.0, 1.1, 0.9, 1.05, 0.95])
    true_value = 1.0
    bias = calculate_bias(estimates, true_value)
    assert bias == pytest.approx(0.0, abs=1e-12)


def test_calculate_mse():
    """Test MSE calculation"""
    estimates = np.array([1.0, 1.1, 0.9, 1.05, 0.95])
    true_value = 1.0
    mse = calculate_mse(estimates, true_value)
    # Exact MSE for the synthetic vector relative to true_value=1.0
    expected = np.mean((estimates - true_value) ** 2)
    assert mse == pytest.approx(expected, rel=0, abs=1e-12)


def test_calculate_coverage():
    """Test coverage calculation"""
    np.random.seed(42)
    estimates = np.random.normal(1.0, 0.1, 100)
    standard_errors = np.full(100, 0.1)
    true_value = 1.0
    
    coverage = calculate_coverage(estimates, standard_errors, true_value)
    assert isinstance(coverage, (float, np.floating))
    assert 0.0 <= coverage <= 1.0
    # Under a normal model with correct SEs, coverage should be near 0.95 for 95% CIs.
    assert 0.85 <= coverage <= 0.99


def test_generate_correlation_matrix():
    """Test correlation matrix generation"""
    corr_matrix = generate_correlation_matrix(n_vars=3, base_correlation=0.3)
    
    assert corr_matrix.shape == (3, 3)
    assert np.allclose(np.diag(corr_matrix), 1.0)
    assert np.allclose(corr_matrix, corr_matrix.T)
    
    # Check (numerically) positive definiteness / semi-definiteness.
    # Use symmetric eigen-solver for stability.
    eigenvalues = np.linalg.eigvalsh(corr_matrix)
    assert np.min(eigenvalues) > -1e-10
