import { Context } from 'telegraf';

export type TelegramContext = Context & {
  message?: {
    text?: string;
  };
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
};

export type PendingTelegramAction = 'case' | 'task';
