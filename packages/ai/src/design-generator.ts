/**
 * AI Design Generator
 * Prompt-to-project floor plan generation
 */

import { aiOrchestrator, type AIMessage } from './orchestrator';

export interface DesignBrief {
  rooms: RoomRequirement[];
  totalArea: number;
  style: string;
  roofType: string;
  parking?: number;
  notes?: string;
}

export interface RoomRequirement {
  name: string;
  count: number;
  minArea: number;
  preferredArea?: number;
  adjacentTo?: string[];
  excludeFrom?: string[];
}

export interface GeneratedLayout {
  id: string;
  brief: DesignBrief;
  rooms: GeneratedRoom[];
  circulation: CirculationPath[];
  generatedAt: Date;
  quality: number;
}

export interface GeneratedRoom {
  id: string;
  name: string;
  area: number;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  windows: WindowPlacement[];
  doors: DoorPlacement[];
}

export interface WindowPlacement {
  wall: 'north' | 'south' | 'east' | 'west';
  position: number;
  width: number;
}

export interface DoorPlacement {
  wall: 'north' | 'south' | 'east' | 'west';
  position: number;
  type: 'entry' | 'interior' | 'exterior';
  connectsTo?: string;
}

export interface CirculationPath {
  from: string;
  to: string;
  type: 'corridor' | 'direct';
}

const DESIGN_SYSTEM_PROMPT = `You are an expert residential architect. Generate floor plans following building codes and best practices.

Requirements:
- All rooms must meet minimum area codes
- Circulation paths must be logical
- Windows should provide natural light and ventilation
- Doors must meet egress requirements (min 32" width)
- Kitchens should be near dining areas
- Bathrooms should be accessible from bedrooms
- Living areas should have good natural light

Generate output as JSON matching the schema provided.`;

export class DesignGenerator {
  private model: string = 'gpt-4o';

  setModel(model: string): void {
    this.model = model;
  }

  async generateFromPrompt(prompt: string): Promise<GeneratedLayout> {
    const messages: AIMessage[] = [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: this.buildPrompt(prompt) },
    ];

    const response = await aiOrchestrator.complete({
      model: this.model,
      messages,
      temperature: 0.3,
    });

    return this.parseGeneratedLayout(response.content, prompt);
  }

  async generateFromBrief(brief: DesignBrief): Promise<GeneratedLayout> {
    const messages: AIMessage[] = [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate a floor plan for the following requirements:\n\n${JSON.stringify(brief, null, 2)}`,
      },
    ];

    const response = await aiOrchestrator.complete({
      model: this.model,
      messages,
      temperature: 0.3,
    });

    return this.parseGeneratedLayout(response.content, JSON.stringify(brief));
  }

  private buildPrompt(userPrompt: string): string {
    return `Create a floor plan based on this description. Include room areas, dimensions, and placement.

User request: ${userPrompt}

Return the floor plan as JSON with the following structure:
{
  "rooms": [
    {
      "name": "Living Room",
      "area": 400,
      "width": 20,
      "depth": 20,
      "x": 0,
      "y": 0,
      "windows": [{"wall": "south", "position": 0.5, "width": 6}],
      "doors": [{"wall": "east", "position": 0.5, "type": "interior"}]
    }
  ],
  "circulation": [
    {"from": "Living Room", "to": "Kitchen", "type": "direct"}
  ]
}`;
  }

  private parseGeneratedLayout(content: string, _prompt: string): GeneratedLayout {
    let data: { rooms?: unknown[]; circulation?: unknown[] };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        data = { rooms: [], circulation: [] };
      }
    } catch {
      data = { rooms: [], circulation: [] };
    }

    const rooms = (data.rooms || []).map((room: unknown, index: number) => {
      const r = room as Record<string, unknown>;
      return {
        id: `room-${index + 1}`,
        name: (r.name as string) || `Room ${index + 1}`,
        area: (r.area as number) || 200,
        x: (r.x as number) || 0,
        y: (r.y as number) || 0,
        width: (r.width as number) || 15,
        depth: (r.depth as number) || 15,
        height: 9 * 12, // Default 9ft in inches
        windows: (r.windows as WindowPlacement[]) || [],
        doors: (r.doors as DoorPlacement[]) || [],
      };
    });

    const circulation = (data.circulation || []).map((c: unknown, _index: number) => {
      const path = c as Record<string, unknown>;
      return {
        from: path.from as string,
        to: path.to as string,
        type: (path.type as 'corridor' | 'direct') || 'direct',
      };
    });

    const brief: DesignBrief = {
      rooms: rooms.map((r) => ({
        name: r.name,
        count: 1,
        minArea: r.area * 0.8,
      })),
      totalArea: rooms.reduce((sum, r) => sum + r.area, 0),
      style: 'modern',
      roofType: 'flat',
    };

    return {
      id: crypto.randomUUID(),
      brief,
      rooms,
      circulation,
      generatedAt: new Date(),
      quality: this.assessQuality(rooms, circulation),
    };
  }

  private assessQuality(rooms: GeneratedRoom[], circulation: CirculationPath[]): number {
    let score = 100;

    if (rooms.length < 3) score -= 20;
    if (circulation.length < rooms.length - 1) score -= 10;

    for (const room of rooms) {
      if (room.windows.length === 0) score -= 5;
      if (room.doors.length === 0) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  async suggestImprovements(layout: GeneratedLayout): Promise<string[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are an expert architect reviewing floor plans.',
      },
      {
        role: 'user',
        content: `Review this floor plan and suggest improvements:\n\n${JSON.stringify(layout, null, 2)}`,
      },
    ];

    const response = await aiOrchestrator.complete({
      model: this.model,
      messages,
      temperature: 0.5,
    });

    return response.content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());
  }
}

export const designGenerator = new DesignGenerator();
