/**
 * LevelSelector component tests
 * T-UI-011: Level selector renders levels and calls selection handler
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelSelector } from './LevelSelector';

const levels = {
  'level-1': { id: 'level-1', name: 'Level 1', elevation: 0, height: 3000, order: 0 },
  'level-2': { id: 'level-2', name: 'Level 2', elevation: 3000, height: 3000, order: 1 },
  'level-3': { id: 'level-3', name: 'Roof', elevation: 6000, height: 1200, order: 2 },
};

describe('T-UI-011: LevelSelector', () => {
  const onSelectLevel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Level label', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    expect(screen.getByText('Level:')).toBeInTheDocument();
  });

  it('renders all level names', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('Roof')).toBeInTheDocument();
  });

  it('renders elevation values', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    expect(screen.getByText('0m')).toBeInTheDocument();
    expect(screen.getByText('3000m')).toBeInTheDocument();
    expect(screen.getByText('6000m')).toBeInTheDocument();
  });

  it('marks selected level with active class', () => {
    render(<LevelSelector levels={levels} selectedLevel="level-2" onSelectLevel={onSelectLevel} />);
    const buttons = screen.getAllByRole('button');
    const activeButton = buttons.find((b) => b.classList.contains('active'));
    expect(activeButton).toBeTruthy();
    expect(activeButton).toHaveTextContent(/Level 2/);
  });

  it('calls onSelectLevel with correct level ID when clicked', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    fireEvent.click(screen.getByText('Level 1'));
    expect(onSelectLevel).toHaveBeenCalledWith('level-1');
  });

  it('clicking different levels calls onSelectLevel each time', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    fireEvent.click(screen.getByText('Level 2'));
    fireEvent.click(screen.getByText('Roof'));
    expect(onSelectLevel).toHaveBeenCalledTimes(2);
    expect(onSelectLevel).toHaveBeenNthCalledWith(1, 'level-2');
    expect(onSelectLevel).toHaveBeenNthCalledWith(2, 'level-3');
  });

  it('sorts levels by elevation descending (highest first)', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    const buttons = screen.getAllByRole('button');
    const names = buttons.map((b) => b.querySelector('.level-name')?.textContent);
    expect(names[0]).toBe('Roof');
    expect(names[1]).toBe('Level 2');
    expect(names[2]).toBe('Level 1');
  });

  it('renders with no selected level (no active class on any button)', () => {
    render(<LevelSelector levels={levels} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    const buttons = screen.getAllByRole('button');
    const activeButtons = buttons.filter((b) => b.classList.contains('active'));
    expect(activeButtons).toHaveLength(0);
  });

  it('renders empty state with empty levels', () => {
    render(<LevelSelector levels={{}} selectedLevel={null} onSelectLevel={onSelectLevel} />);
    expect(screen.getByText('Level:')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders single level', () => {
    const single = { 'l1': { id: 'l1', name: 'Ground', elevation: 0, height: 3000, order: 0 } };
    render(<LevelSelector levels={single} selectedLevel="l1" onSelectLevel={onSelectLevel} />);
    expect(screen.getByText('Ground')).toBeInTheDocument();
  });
});
