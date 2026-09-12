import type { ExchangeRate } from '@shared/types';

/**
 * Единственная точка конфигурации внешнего провайдера курсов.
 * URL/ключ хранится в app_settings (ключи: 'exchange_rate_provider_url',
 * 'exchange_rate_provider_key'), чтобы смена провайдера не трогала контракт
 * financeRepository.
 *
 * Phase 1: заглушка. Реализация — отдельная задача после выбора провайдера
 * (PROJECT_SPEC.md §8a, не блокирует Phase 1, есть setManualRate).
 */
export async function fetchRates(
  date: string,
  currencyCodes: string[]
): Promise<ExchangeRate[]> {
  void date;
  void currencyCodes;
  throw new Error(
    'refreshOnlineRates: not implemented in Phase 1 (exchange rate provider not chosen; use financeRepository.setManualRate)'
  );
}