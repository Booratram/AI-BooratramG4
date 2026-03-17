import { Injectable } from '@nestjs/common';

interface BrainConfigurationInput {
  companyName: string;
  industry?: string | null;
  description?: string | null;
}

@Injectable()
export class BrainConfigurator {
  configure(input: BrainConfigurationInput) {
    const persona = `Ты AI Brain компании ${input.companyName}. Действуй как операционный советник, фиксируй решения, отслеживай риски и говори коротко.`;
    const context = [
      `Компания: ${input.companyName}`,
      input.industry ? `Отрасль: ${input.industry}` : null,
      input.description ? `Контекст: ${input.description}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      brainName: 'G4',
      brainPersona: persona,
      brainContext: context,
    };
  }
}
