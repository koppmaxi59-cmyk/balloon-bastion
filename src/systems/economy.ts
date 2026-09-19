// ============================================================
// economy.ts — Cash management, buy/sell/earn
// ============================================================

export class Economy {
  cash: number;

  constructor(startCash = 650) {
    this.cash = startCash;
  }

  canAfford(cost: number): boolean {
    return this.cash >= cost;
  }

  spend(amount: number): boolean {
    if (this.cash < amount) return false;
    this.cash -= amount;
    return true;
  }

  earn(amount: number): void {
    this.cash += amount;
  }

  /** End-of-round bonus: $100 + round number (1-based) */
  roundBonus(roundNumber: number): void {
    const bonus = 100 + roundNumber;
    this.earn(bonus);
  }
}
