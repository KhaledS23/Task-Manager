import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppShell } from '@/app/App';
import { DEFAULT_SETTINGS, DEFAULT_TOKEN_INFO, STORAGE_KEYS } from '../../shared/utils';

vi.mock('@/shared/services/filesystem', () => ({
  getAttachmentDirectoryHandle: vi.fn(async () => null),
  readFile: vi.fn(async () => null),
  writeFile: vi.fn(async () => null),
}));

describe('Task edit flow', () => {
  beforeEach(() => {
    window.localStorage.clear();

    const seedState = {
      tiles: [
        {
          id: 'tile-1',
          title: 'Timeline',
          projectId: 'proj-default',
          tasks: [
            {
              id: 'task-1',
              label: 'Finalize Launch Plan',
              description: 'Polish the launch plan details.',
              owner: 'khaled',
              dueDate: '2023-11-15',
              priority: 'high',
              status: 'todo',
              category: 'Timeline',
              tags: ['launch'],
              prio: true,
              done: false,
              createdAt: '2023-11-01T10:00:00.000Z',
              updatedAt: '2023-11-01T10:00:00.000Z',
            },
          ],
        },
      ],
      meetings: [],
      projects: [
        {
          id: 'proj-default',
          name: 'General Tasks',
          description: 'Tasks without specific project',
          color: '#6B7280',
          status: 'active',
          startDate: '2023-11-01',
          endDate: null,
          createdAt: '2023-11-01T09:00:00.000Z',
          attachments: [],
        },
      ],
      settings: {
        ...DEFAULT_SETTINGS,
        theme: 'light',
      },
    };

    window.localStorage.setItem(STORAGE_KEYS.WORK_CHECKLIST, JSON.stringify(seedState));
    window.localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(DEFAULT_TOKEN_INFO));
  });

  it('opens the edit modal when clicking a task tile', async () => {
    render(
      <MemoryRouter initialEntries={["/timeline"]}>
        <AppShell />
      </MemoryRouter>
    );

    const taskCard = await screen.findByText('Finalize Launch Plan');
    await userEvent.click(taskCard);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit task/i })).toBeInTheDocument();
    });
  });
});
