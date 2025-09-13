import { useState, useEffect } from 'react';
import { generateId } from '../../../shared/utils';
import { StorageService } from '../../../shared/services';

export const useMeetings = () => {
  const [meetings, setMeetings] = useState(() => {
    const saved = StorageService.get('workChecklist');
    if (saved && Array.isArray(saved.meetings)) {
      return saved.meetings;
    }
    return [];
  });

  // Persist meetings to localStorage
  useEffect(() => {
    const saved = StorageService.get('workChecklist', {});
    StorageService.set('workChecklist', { ...saved, meetings });
  }, [meetings]);

  const addMeeting = (title, projectId = 'proj-default') => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    const newMeeting = { 
      id: generateId('meeting'), 
      title: trimmed, 
      notes: [], 
      attachments: [], 
      updatedAt: now, 
      icon: null,
      projectId: projectId || 'proj-default'
    };
    setMeetings(prev => [...prev, newMeeting]);
  };

  const renameMeeting = (meetingId, newTitle) => {
    const now = Date.now();
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, title: newTitle, updatedAt: now } 
        : meeting
    ));
  };

  const removeMeeting = (meetingId) => {
    setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
  };

  const updateMeetingIcon = (meetingId, icon) => {
    const now = Date.now();
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, icon, updatedAt: now } 
        : meeting
    ));
  };

  const addMeetingAttachment = (meetingId, attachments) => {
    setMeetings(prev => prev.map(meeting => {
      if (meeting.id !== meetingId) return meeting;
      return { ...meeting, attachments: [...(meeting.attachments || []), ...attachments] };
    }));
  };

  const removeMeetingAttachment = (meetingId, attachmentId) => {
    setMeetings(prev => prev.map(meeting => {
      if (meeting.id !== meetingId) return meeting;
      return { 
        ...meeting, 
        attachments: meeting.attachments.filter(att => att.id !== attachmentId) 
      };
    }));
  };

  const addNote = (meetingId, noteData) => {
    const now = Date.now();
    const newNote = {
      id: generateId('note'),
      ...noteData,
      createdAt: now,
      updatedAt: now,
    };
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { 
            ...meeting, 
            notes: [...meeting.notes, newNote],
            updatedAt: now
          }
        : meeting
    ));
  };

  const updateNote = (meetingId, noteId, updatedFields) => {
    const now = Date.now();
    setMeetings(prev => prev.map(meeting => {
      if (meeting.id !== meetingId) return meeting;
      return {
        ...meeting,
        notes: meeting.notes.map(note => 
          note.id === noteId 
            ? { ...note, ...updatedFields, updatedAt: now }
            : note
        ),
        updatedAt: now
      };
    }));
  };

  const removeNote = (meetingId, noteId) => {
    const now = Date.now();
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId 
        ? { 
            ...meeting, 
            notes: meeting.notes.filter(note => note.id !== noteId),
            updatedAt: now
          }
        : meeting
    ));
  };

  const reorderMeetings = (fromIndex, toIndex) => {
    setMeetings(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  return {
    meetings,
    setMeetings,
    addMeeting,
    renameMeeting,
    removeMeeting,
    updateMeetingIcon,
    addMeetingAttachment,
    removeMeetingAttachment,
    addNote,
    updateNote,
    removeNote,
    reorderMeetings,
  };
};
