import { useState, useEffect, useMemo } from 'react';
import { generateId } from '../../../shared/utils';
import { StorageService } from '../../../shared/services';

const STORAGE_KEY = 'workChecklist';

const normalizeMeeting = (meeting) => {
  if (!meeting) return null;
  if (!meeting.version || meeting.version < 2) {
    // Legacy shape with notes array
    const primaryNote = Array.isArray(meeting.notes) ? meeting.notes[0] : null;
    return {
      id: meeting.id,
      projectId: meeting.projectId || 'proj-default',
      title: meeting.title || primaryNote?.title || 'Untitled Meeting',
      date: primaryNote?.date || new Date().toISOString().slice(0, 10),
      participants: primaryNote?.attendance || '',
      agenda: primaryNote?.agenda || '',
      summary: primaryNote?.summary || '',
      followUps: primaryNote?.actions || '',
      linkedTaskIds: Array.isArray(primaryNote?.tasks) ? primaryNote.tasks : [],
      attachments: Array.isArray(meeting.attachments) ? meeting.attachments : [],
      createdAt: meeting.createdAt || new Date().toISOString(),
      updatedAt: meeting.updatedAt || new Date().toISOString(),
      version: 2,
    };
  }
  return meeting;
};

export const useMeetings = () => {
  const [meetings, setMeetings] = useState(() => {
    const saved = StorageService.get(STORAGE_KEY);
    if (saved && Array.isArray(saved.meetings)) {
      return saved.meetings.map(normalizeMeeting).filter(Boolean);
    }
    return [];
  });

  // Persist meetings to localStorage whenever they change
  useEffect(() => {
    const saved = StorageService.get(STORAGE_KEY, {});
    StorageService.set(STORAGE_KEY, { ...saved, meetings });
  }, [meetings]);

  const addMeeting = (projectId) => {
    const now = new Date().toISOString();
    const meeting = {
      id: generateId('meeting'),
      projectId: projectId || 'proj-default',
      title: 'New Meeting',
      date: now.slice(0, 10),
      participants: '',
      agenda: '',
      summary: '',
      followUps: '',
      linkedTaskIds: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      version: 2,
    };
    setMeetings((prev) => [...prev, meeting]);
    return meeting.id;
  };

  const updateMeeting = (meetingId, updates) => {
    const now = new Date().toISOString();
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === meetingId
          ? { ...meeting, ...updates, updatedAt: now }
          : meeting
      )
    );
  };

  const removeMeeting = (meetingId) => {
    setMeetings((prev) => prev.filter((meeting) => meeting.id !== meetingId));
  };

  const addMeetingAttachment = (meetingId, attachmentMeta) => {
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              attachments: [...meeting.attachments, attachmentMeta],
              updatedAt: new Date().toISOString(),
            }
          : meeting
      )
    );
  };

  const updateMeetingAttachment = (meetingId, attachmentId, updates) => {
    setMeetings((prev) =>
      prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;
        return {
          ...meeting,
          attachments: meeting.attachments.map((att) =>
            att.id === attachmentId ? { ...att, ...updates } : att
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const removeMeetingAttachment = (meetingId, attachmentId) => {
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              attachments: meeting.attachments.filter((att) => att.id !== attachmentId),
              updatedAt: new Date().toISOString(),
            }
          : meeting
      )
    );
  };

  const linkTaskToMeeting = (meetingId, taskId) => {
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              linkedTaskIds: meeting.linkedTaskIds.includes(taskId)
                ? meeting.linkedTaskIds
                : [...meeting.linkedTaskIds, taskId],
              updatedAt: new Date().toISOString(),
            }
          : meeting
      )
    );
  };

  const unlinkTaskFromMeeting = (meetingId, taskId) => {
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              linkedTaskIds: meeting.linkedTaskIds.filter((id) => id !== taskId),
              updatedAt: new Date().toISOString(),
            }
          : meeting
      )
    );
  };

  const reorderMeetings = (fromIndex, toIndex) => {
    setMeetings((prev) => {
      const list = [...prev];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return list;
    });
  };

  const getMeetingsByProject = useMemo(() => {
    const map = new Map();
    meetings.forEach((meeting) => {
      const key = meeting.projectId || 'proj-default';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(meeting);
    });
    return map;
  }, [meetings]);

  return {
    meetings,
    getMeetingsByProject,
    addMeeting,
    updateMeeting,
    removeMeeting,
    addMeetingAttachment,
    updateMeetingAttachment,
    removeMeetingAttachment,
    linkTaskToMeeting,
    unlinkTaskFromMeeting,
    reorderMeetings,
    setMeetings,
  };
};

