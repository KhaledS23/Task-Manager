import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { DEFAULT_SETTINGS, DEFAULT_TOKEN_INFO, STORAGE_KEYS } from '../../shared/utils';

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
    render(<App />);

    const taskCard = await screen.findByText('Finalize Launch Plan');
    await userEvent.click(taskCard);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit task/i })).toBeInTheDocument();
    });
  });
});
