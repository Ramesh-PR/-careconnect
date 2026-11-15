import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import OverviewTab from '../components/dashboard/OverviewTab';
import MedicationsTab from '../components/dashboard/MedicationsTab';
import AppointmentsTab from '../components/dashboard/AppointmentsTab';
import FamilyCaregiversTab from '../components/dashboard/FamilyCaregiversTab';
import AdherenceReportsTab from '../components/dashboard/AdherenceReportsTab';
import PatientProfileTab from '../components/dashboard/PatientProfileTab';
import NotificationsTab from '../components/dashboard/NotificationsTab';
import {
  initialPatientProfile,
  initialMedications,
  initialAppointments,
  initialCaregivers,
  initialNotifications,
} from '../data/appData';
import {
  initialInvitations,
  initialAuditLogs,
  ROLE_PERMISSIONS_MATRIX,
} from '../services/accessControlService';
import {
  MEDICAL_SAFETY_DISCLAIMER,
  initialNotificationPreferences,
  initialDispatchHistory,
} from '../services/smartNotificationService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  fetchAllUserDataFromSupabase,
  upsertPatientProfileInDb,
  createMedicationInDb,
  updateMedicationDetailsInDb,
  recordMedicationStatusInDb,
  deleteMedicationFromDb,
  createAppointmentInDb,
  updateAppointmentDetailsInDb,
  updateAppointmentStatusInDb,
  deleteAppointmentFromDb,
  revokeCaregiverAccessInDb,
  invokeSmartNotificationsEdgeFunction,
} from '../services/careConnectService';

/**
 * Crash-proof helper for reading from localStorage.
 */
function loadSafeStorage(key, fallbackValue, mustBeArray = false) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    if (mustBeArray && !Array.isArray(parsed)) return fallbackValue;
    if (!mustBeArray && (typeof parsed !== 'object' || parsed === null)) {
      return fallbackValue;
    }
    return parsed;
  } catch (err) {
    console.warn(`Safe fallback used for ${key}:`, err);
    return fallbackValue;
  }
}

/**
 * Crash-proof helper for saving to localStorage.
 */
function saveSafeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Could not save ${key} to localStorage:`, err);
  }
}

const initialDoseLogs = [
  {
    id: 'log-1',
    medicationId: 'med-1',
    medicationName: 'Lisinopril',
    dosage: '10 mg',
    status: 'Taken',
    loggedTime: '08:04 AM',
    logDate: 'Today',
    notes: 'Confirmed taken at 08:04 AM',
  },
  {
    id: 'log-2',
    medicationId: 'med-2',
    medicationName: 'Metformin',
    dosage: '500 mg',
    status: 'Taken',
    loggedTime: '08:32 AM',
    logDate: 'Today',
    notes: 'Confirmed taken at 08:32 AM',
  },
];

/**
 * DashboardApp Component:
 * Connects Patient Profiles, Medications, Taken/Missed Logs, Appointments, Caregivers,
 * Single-Use Expiring Invitations, Role-Based Access Control, and Security Audit Logs.
 */
export default function DashboardApp({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [verifiedPatientUserId, setVerifiedPatientUserId] = useState(
    currentUser?.sharedPatientId || currentUser?.id || 'default'
  );
  const userKey = verifiedPatientUserId;

  // Server-verified role ('patient' | 'caretaker' | 'family_member')
  const [activeServerRole, setActiveServerRole] = useState(() => {
    if (currentUser?.role === 'caregiver' || currentUser?.role === 'family_member') {
      return 'family_member';
    }
    if (currentUser?.role === 'caretaker') return 'caretaker';
    return 'patient';
  });

  const [dbSyncStatus, setDbSyncStatus] = useState(
    isSupabaseConfigured && currentUser?.isSupabaseUser
      ? 'Syncing with Supabase...'
      : 'Authenticated & RLS Protected'
  );

  const [patientProfile, setPatientProfile] = useState(() =>
    loadSafeStorage(
      `cc_profile_${userKey}`,
      {
        ...initialPatientProfile,
        fullName: currentUser?.name || initialPatientProfile.fullName,
        preferredName:
          currentUser?.name?.split(' ')[0] || initialPatientProfile.preferredName,
        email: currentUser?.email || initialPatientProfile.email,
        phone: currentUser?.phone || initialPatientProfile.phone,
      },
      false
    )
  );

  const [medications, setMedications] = useState(() =>
    loadSafeStorage(`cc_medications_${userKey}`, initialMedications, true)
  );

  const [medicationLogs, setMedicationLogs] = useState(() =>
    loadSafeStorage(`cc_medication_logs_${userKey}`, initialDoseLogs, true)
  );

  const [appointments, setAppointments] = useState(() =>
    loadSafeStorage(`cc_appointments_${userKey}`, initialAppointments, true)
  );

  const [caregivers, setCaregivers] = useState(() =>
    loadSafeStorage(`cc_caregivers_${userKey}`, initialCaregivers, true)
  );

  const [invitations, setInvitations] = useState(() =>
    loadSafeStorage(`cc_invitations_${userKey}`, initialInvitations, true)
  );

  const [auditLogs, setAuditLogs] = useState(() =>
    loadSafeStorage(`cc_audit_logs_${userKey}`, initialAuditLogs, true)
  );

  const [notifications, setNotifications] = useState(() =>
    loadSafeStorage(`cc_notifications_${userKey}`, initialNotifications, true)
  );

  const [notificationPrefs, setNotificationPrefs] = useState(() =>
    loadSafeStorage(`cc_notification_prefs_${userKey}`, initialNotificationPreferences, false)
  );

  const [dispatchHistory, setDispatchHistory] = useState(() =>
    loadSafeStorage(`cc_dispatch_history_${userKey}`, initialDispatchHistory, true)
  );

  const isCloudConnected = Boolean(
    isSupabaseConfigured && supabase && currentUser?.id && currentUser?.isSupabaseUser
  );

  // Load real saved data from Supabase when logged in with a Supabase user
  useEffect(() => {
    let isMounted = true;
    async function loadCloudData() {
      if (!isCloudConnected) return;
      try {
        setDbSyncStatus('Loading from Supabase...');
        const cloudData = await fetchAllUserDataFromSupabase(currentUser);
        if (isMounted && cloudData) {
          if (cloudData.verifiedContext) {
            setVerifiedPatientUserId(cloudData.verifiedContext.patientUserId);
            setActiveServerRole(cloudData.verifiedContext.verifiedRole);
          }
          setPatientProfile(cloudData.profile);
          setMedications(cloudData.medications);
          setMedicationLogs(cloudData.medicationLogs);
          setAppointments(cloudData.appointments);
          setCaregivers(cloudData.caregivers);
          setDbSyncStatus('Supabase Cloud + RLS Synced');
        }
      } catch (err) {
        console.error('Supabase fetch error:', err);
        if (isMounted) {
          setDbSyncStatus('Supabase Error (Using Local Backup)');
        }
      }
    }
    loadCloudData();
    return () => {
      isMounted = false;
    };
  }, [isCloudConnected, currentUser]);

  // Save state changes to per-user isolated storage safely
  useEffect(() => {
    saveSafeStorage(`cc_profile_${userKey}`, patientProfile);
  }, [patientProfile, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_medications_${userKey}`, medications);
  }, [medications, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_medication_logs_${userKey}`, medicationLogs);
  }, [medicationLogs, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_appointments_${userKey}`, appointments);
  }, [appointments, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_caregivers_${userKey}`, caregivers);
  }, [caregivers, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_invitations_${userKey}`, invitations);
  }, [invitations, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_audit_logs_${userKey}`, auditLogs);
  }, [auditLogs, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_notifications_${userKey}`, notifications);
  }, [notifications, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_notification_prefs_${userKey}`, notificationPrefs);
  }, [notificationPrefs, userKey]);

  useEffect(() => {
    saveSafeStorage(`cc_dispatch_history_${userKey}`, dispatchHistory);
  }, [dispatchHistory, userKey]);

  // Helper to push a new notification to the top of the feed
  const pushNotification = (type, title, message) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      time: 'Just now',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...(Array.isArray(prev) ? prev : [])]);
  };

  // Helper to append an immutable entry to the Security Audit Log
  const handleAppendAuditLog = (entry) => {
    const nowFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const newAudit = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventType: entry.eventType || 'SECURITY_EVENT',
      severity: entry.severity || 'info',
      actorEmail: entry.actorEmail || currentUser?.email || 'patient@careconnect.health',
      actorRole: entry.actorRole || activeServerRole,
      description: entry.description,
      createdAt: `Today, ${nowFormatted}`,
    };
    setAuditLogs((prev) => [newAudit, ...(Array.isArray(prev) ? prev : [])]);
  };

  // Patient Profile Update Handler
  const handleUpdateProfile = async (updatedProfile) => {
    if (activeServerRole !== 'patient') {
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: `Blocked profile update attempt by role '${activeServerRole}'. Only 'patient' can modify medical ID details.`,
      });
      return;
    }

    setPatientProfile(updatedProfile);
    handleAppendAuditLog({
      eventType: 'PROFILE_UPDATED',
      severity: 'info',
      description: `Patient medical profile updated by ${updatedProfile.fullName}.`,
    });

    if (isCloudConnected) {
      try {
        setDbSyncStatus('Saving profile to Supabase...');
        const saved = await upsertPatientProfileInDb(
          verifiedPatientUserId,
          updatedProfile
        );
        if (saved) setPatientProfile(saved);
        setDbSyncStatus('Supabase Cloud + RLS Synced');
      } catch (err) {
        console.error('Failed to save profile in Supabase:', err);
        setDbSyncStatus('Supabase Save Error');
      }
    }
  };

  // Medication Dose Status Handler: Records 'Taken', 'Missed', or resets to 'Due Now'
  // Includes Duplicate Dose Log Prevention for the same medication on the same day!
  const handleRecordMedicationDose = async (medId, targetStatus) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const todayDateStr = new Date().toISOString().slice(0, 10);

    const targetMed = medications.find((m) => m.id === medId);
    if (!targetMed) return;

    // Duplicate Dose Prevention: If already in the exact same status today, do not double-decrement pills or duplicate log
    if (
      (targetStatus === 'Taken' || targetStatus === 'Missed') &&
      targetMed.status === targetStatus
    ) {
      return;
    }

    const currentPills = Number(targetMed.pillsRemaining) || 0;
    const newPillsRemaining =
      targetStatus === 'Taken'
        ? Math.max(0, currentPills - 1)
        : targetMed.status === 'Taken'
        ? currentPills + 1
        : currentPills;

    setMedications((prev) =>
      prev.map((med) =>
        med.id === medId
          ? {
              ...med,
              status: targetStatus,
              takenAt: targetStatus !== 'Due Now' ? nowTime : null,
              lastLoggedDate:
                targetStatus === 'Taken' || targetStatus === 'Missed'
                  ? todayDateStr
                  : null,
              pillsRemaining: newPillsRemaining,
            }
          : med
      )
    );

    if (targetStatus === 'Taken' || targetStatus === 'Missed') {
      const doseIdempotencyKey = `${targetMed.id}:${todayDateStr}`;
      const localLog = {
        id: `log-${Date.now()}`,
        medicationId: targetMed.id,
        medicationName: targetMed.name,
        dosage: targetMed.dosage,
        status: targetStatus,
        loggedTime: nowTime,
        logDate: todayDateStr,
        doseIdempotencyKey,
        notes:
          targetStatus === 'Taken'
            ? `Confirmed taken at ${nowTime} (Role: ${activeServerRole})`
            : `Marked as missed dose at ${nowTime} (Role: ${activeServerRole})`,
      };
      // Upsert by doseIdempotencyKey so the same medication on the same day never creates duplicate log rows!
      setMedicationLogs((prev) => [
        localLog,
        ...prev.filter((l) => l.doseIdempotencyKey !== doseIdempotencyKey),
      ]);

      handleAppendAuditLog({
        eventType: `DOSE_${targetStatus.toUpperCase()}`,
        severity: targetStatus === 'Missed' ? 'warning' : 'info',
        description: `Medication '${targetMed.name} (${targetMed.dosage})' marked as ${targetStatus} at ${nowTime} by role '${activeServerRole}'.`,
      });

      pushNotification(
        targetStatus === 'Taken' ? 'reminder' : 'refill',
        `Medication ${targetStatus}: ${targetMed.name}`,
        `${patientProfile?.preferredName || 'Patient'} marked ${targetMed.name} (${
          targetMed.dosage
        }) as ${targetStatus} at ${nowTime}.`
      );
    }

    if (isCloudConnected) {
      try {
        setDbSyncStatus('Saving dose log to Supabase...');
        const result = await recordMedicationStatusInDb(
          verifiedPatientUserId,
          currentUser.id,
          activeServerRole,
          targetMed,
          targetStatus,
          nowTime,
          newPillsRemaining,
          todayDateStr
        );
        if (result?.log) {
          setMedicationLogs((prev) => [
            result.log,
            ...prev.filter(
              (l) =>
                l.doseIdempotencyKey !== result.log.doseIdempotencyKey &&
                !String(l.id).startsWith('log-')
            ),
          ]);
        }
        setDbSyncStatus('Supabase Cloud + RLS Synced');
      } catch (err) {
        console.error('Failed to record dose in Supabase:', err);
        setDbSyncStatus('Supabase Save Error');
      }
    }
  };

  const handleAddMedication = async (newMed) => {
    const perms = ROLE_PERMISSIONS_MATRIX[activeServerRole];
    if (!perms?.canAddOrEditMedications) {
      const msg = `RLS PERMISSION DENIED: Role '${activeServerRole}' cannot insert new medications. Only 'patient' and 'caretaker' can add prescriptions.`;
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: msg,
      });
      pushNotification('refill', 'Permission Denied by RLS', msg);
      return;
    }

    setMedications((prev) => [newMed, ...prev]);
    handleAppendAuditLog({
      eventType: 'MEDICATION_ADDED',
      severity: 'info',
      description: `Added prescription '${newMed.name} (${newMed.dosage})' by role '${activeServerRole}'.`,
    });

    pushNotification(
      'reminder',
      `New Medication Added: ${newMed.name}`,
      `${newMed.name} (${newMed.dosage}) scheduled for ${newMed.time} (${newMed.frequency}).`
    );

    if (isCloudConnected) {
      try {
        setDbSyncStatus('Saving medicine to Supabase...');
        const created = await createMedicationInDb(
          verifiedPatientUserId,
          newMed
        );
        if (created) {
          setMedications((prev) =>
            prev.map((m) => (m.id === newMed.id ? created : m))
          );
        }
        setDbSyncStatus('Supabase Cloud + RLS Synced');
      } catch (err) {
        console.error('Failed to insert medication in Supabase:', err);
      }
    }
  };

  const handleEditMedication = async (updatedMed) => {
    const perms = ROLE_PERMISSIONS_MATRIX[activeServerRole];
    if (!perms?.canAddOrEditMedications) {
      const msg = `RLS PERMISSION DENIED: Role '${activeServerRole}' cannot edit medications. Only 'patient' and 'caretaker' can modify prescriptions.`;
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: msg,
      });
      pushNotification('refill', 'Permission Denied by RLS', msg);
      return;
    }

    setMedications((prev) =>
      prev.map((m) => (m.id === updatedMed.id ? { ...m, ...updatedMed } : m))
    );
    handleAppendAuditLog({
      eventType: 'MEDICATION_UPDATED',
      severity: 'info',
      description: `Updated prescription '${updatedMed.name} (${updatedMed.dosage})' by role '${activeServerRole}'.`,
    });

    if (isCloudConnected) {
      try {
        setDbSyncStatus('Updating medicine in Supabase...');
        const saved = await updateMedicationDetailsInDb(
          verifiedPatientUserId,
          updatedMed
        );
        if (saved) {
          setMedications((prev) =>
            prev.map((m) => (m.id === updatedMed.id ? saved : m))
          );
        }
        setDbSyncStatus('Supabase Cloud + RLS Synced');
      } catch (err) {
        console.error('Failed to update medication in Supabase:', err);
      }
    }
  };

  const handleDeleteMedication = async (medId) => {
    const perms = ROLE_PERMISSIONS_MATRIX[activeServerRole];
    if (!perms?.canDeleteMedications) {
      const msg = `RLS PERMISSION DENIED: Role '${activeServerRole}' attempted to delete medication (${medId}). Database policy "Only patient can delete medications" blocked the request.`;
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: msg,
      });
      pushNotification('refill', 'Delete Blocked by RLS Policy', msg);
      return;
    }

    const target = medications.find((m) => m.id === medId);
    setMedications((prev) => prev.filter((m) => m.id !== medId));
    handleAppendAuditLog({
      eventType: 'MEDICATION_DELETED',
      severity: 'warning',
      description: `Patient deleted medication '${target?.name || medId}'.`,
    });

    if (isCloudConnected) {
      try {
        await deleteMedicationFromDb(verifiedPatientUserId, medId);
      } catch (err) {
        console.error('Failed to delete medication in Supabase:', err);
      }
    }
  };

  // Appointment Handlers
  const handleAddAppointment = async (newApt) => {
    const perms = ROLE_PERMISSIONS_MATRIX[activeServerRole];
    if (!perms?.canAddOrEditMedications) {
      const msg = `RLS PERMISSION DENIED: Role '${activeServerRole}' is read-only for doctor appointments.`;
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'warning',
        description: msg,
      });
      return;
    }

    setAppointments((prev) => [newApt, ...prev]);
    handleAppendAuditLog({
      eventType: 'APPOINTMENT_CREATED',
      severity: 'info',
      description: `Scheduled visit with ${newApt.doctorName} on ${newApt.date} by role '${activeServerRole}'.`,
    });

    pushNotification(
      'appointment',
      `New Appointment Scheduled`,
      `Visit with ${newApt.doctorName} (${newApt.specialty}) booked for ${newApt.date} at ${newApt.time}.`
    );

    if (isCloudConnected) {
      try {
        const created = await createAppointmentInDb(
          verifiedPatientUserId,
          newApt
        );
        if (created) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === newApt.id ? created : a))
          );
        }
      } catch (err) {
        console.error('Failed to insert appointment in Supabase:', err);
      }
    }
  };

  const handleEditAppointment = async (updatedApt) => {
    const perms = ROLE_PERMISSIONS_MATRIX[activeServerRole];
    if (!perms?.canAddOrEditMedications) {
      const msg = `RLS PERMISSION DENIED: Role '${activeServerRole}' cannot edit doctor appointments.`;
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'warning',
        description: msg,
      });
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === updatedApt.id ? { ...a, ...updatedApt } : a))
    );
    handleAppendAuditLog({
      eventType: 'APPOINTMENT_UPDATED',
      severity: 'info',
      description: `Updated visit with ${updatedApt.doctorName} on ${updatedApt.date} by role '${activeServerRole}'.`,
    });

    if (isCloudConnected) {
      try {
        const saved = await updateAppointmentDetailsInDb(
          verifiedPatientUserId,
          updatedApt
        );
        if (saved) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === updatedApt.id ? saved : a))
          );
        }
      } catch (err) {
        console.error('Failed to update appointment in Supabase:', err);
      }
    }
  };

  const handleToggleAppointmentStatus = async (aptId) => {
    const targetApt = appointments.find((a) => a.id === aptId);
    if (!targetApt) return;
    const nextStatus = targetApt.status === 'Upcoming' ? 'Completed' : 'Upcoming';

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === aptId ? { ...apt, status: nextStatus } : apt))
    );

    if (isCloudConnected) {
      try {
        await updateAppointmentStatusInDb(
          verifiedPatientUserId,
          aptId,
          nextStatus
        );
      } catch (err) {
        console.error('Failed to update appointment in Supabase:', err);
      }
    }
  };

  const handleDeleteAppointment = async (aptId) => {
    if (activeServerRole !== 'patient') {
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: `Blocked appointment deletion attempt by role '${activeServerRole}'.`,
      });
      return;
    }

    setAppointments((prev) => prev.filter((a) => a.id !== aptId));
    if (isCloudConnected) {
      try {
        await deleteAppointmentFromDb(verifiedPatientUserId, aptId);
      } catch (err) {
        console.error('Failed to delete appointment in Supabase:', err);
      }
    }
  };

  // Secure Invitation & Access Grant Handlers
  const handleCreateInvitation = (newInvite) => {
    setInvitations((prev) => [newInvite, ...prev]);
    handleAppendAuditLog({
      eventType: 'INVITE_CREATED',
      severity: 'info',
      description: `Generated single-use ${newInvite.assignedRole} invite (${newInvite.codePreview}) for ${newInvite.invitedEmail} (SHA-256 hashed).`,
    });
    pushNotification(
      'family',
      `Single-Use Invite Generated`,
      `Invite code ${newInvite.codePreview} created for ${newInvite.invitedName} (${newInvite.invitedEmail}).`
    );
  };

  const handleMarkInvitationAccepted = (inviteId, matchedInvite) => {
    const nowIso = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setInvitations((prev) =>
      prev.map((inv) =>
        inv.id === inviteId
          ? { ...inv, status: 'accepted', usedAt: nowIso }
          : inv
      )
    );

    // Add or activate the person in the Caregivers / Access Grants list
    const newGrantCaregiver = {
      id: `cg-${Date.now()}`,
      name: matchedInvite.invitedName,
      relationship: matchedInvite.relationship,
      role:
        matchedInvite.assignedRole === 'caretaker'
          ? 'Professional Caretaker'
          : 'Family Member',
      assignedRole: matchedInvite.assignedRole,
      phone: '(555) 819-4022',
      email: matchedInvite.invitedEmail,
      availability: 'Verified via Single-Use Code',
      isEmergencyContact: matchedInvite.assignedRole === 'family_member',
      receivesMissedDoseAlerts: true,
      accessStatus: 'active',
    };

    setCaregivers((prev) => [newGrantCaregiver, ...prev]);

    handleAppendAuditLog({
      eventType: 'INVITE_ACCEPTED',
      severity: 'info',
      actorEmail: matchedInvite.invitedEmail,
      actorRole: matchedInvite.assignedRole,
      description: `Backend verified single-use code ${matchedInvite.codePreview}. Granted '${matchedInvite.assignedRole}' access to ${matchedInvite.invitedName} (${matchedInvite.invitedEmail}).`,
    });
  };

  const handleRevokeCaregiverAccess = async (cgId) => {
    if (activeServerRole !== 'patient') {
      handleAppendAuditLog({
        eventType: 'UNAUTHORIZED_BLOCKED',
        severity: 'critical',
        description: `RLS BLOCK: Role '${activeServerRole}' attempted to revoke access grant ${cgId}. Only 'patient' can revoke access.`,
      });
      return;
    }

    const target = caregivers.find((c) => c.id === cgId);
    setCaregivers((prev) =>
      prev.map((c) =>
        c.id === cgId ? { ...c, accessStatus: 'revoked' } : c
      )
    );

    handleAppendAuditLog({
      eventType: 'ACCESS_REVOKED',
      severity: 'warning',
      description: `Patient revoked access for ${target?.name} (${target?.email}). Supabase RLS immediately blocks all further queries from this user.`,
    });

    pushNotification(
      'family',
      `Access Revoked: ${target?.name}`,
      `${target?.name}'s access to ${patientProfile?.preferredName}'s records has been revoked.`
    );

    if (isCloudConnected && target?.email) {
      try {
        await revokeCaregiverAccessInDb(target.email);
      } catch (err) {
        console.error('Failed to revoke caregiver in Supabase:', err);
      }
    }
  };

  const handleRestoreCaregiverAccess = (cgId) => {
    if (activeServerRole !== 'patient') return;
    const target = caregivers.find((c) => c.id === cgId);
    setCaregivers((prev) =>
      prev.map((c) =>
        c.id === cgId ? { ...c, accessStatus: 'active' } : c
      )
    );

    handleAppendAuditLog({
      eventType: 'ACCESS_RESTORED',
      severity: 'info',
      description: `Patient restored active access grant for ${target?.name} (${target?.email}).`,
    });
  };

  // Notification Handlers
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const handleDeleteNotification = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  // Smart Notification Engine Handlers (Medication Reminder, Unconfirmed Grace Alert, Appointment Reminder)
  // Connects to `supabase.functions.invoke('smart-notifications')` when configured, and honestly reports
  // whether Resend delivered an external email vs. simulated in local/dry-run mode!
  const handleTriggerSmartReminderEmail = async (med, localDateKey) => {
    const recipientEmail = patientProfile?.email || 'patient@example.com';
    const idempotencyKey = `med_reminder:${med.id}:${localDateKey}:${recipientEmail}`;

    // Check Duplicate-Email Prevention
    const alreadySent = dispatchHistory.some(
      (d) =>
        d.idempotencyKey === idempotencyKey &&
        (d.deliveryStatus === 'sent' || d.deliveryStatus === 'simulated_local')
    );

    if (alreadySent) {
      const skippedEntry = {
        id: `disp-${Date.now()}`,
        idempotencyKey: `${idempotencyKey}:dup-${Date.now().toString().slice(-3)}`,
        notificationType: 'MEDICATION_REMINDER',
        recipientEmail,
        recipientName: patientProfile?.fullName || 'Patient',
        recipientRole: 'patient',
        subject: `[SKIPPED DUPLICATE] Medication Reminder: ${med.name} (${med.dosage})`,
        bodyPreview: `Blocked duplicate reminder for ${med.name} on ${localDateKey}. Unique idempotency_key (${idempotencyKey}) already exists.`,
        safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
        doseStateAtSend: med.status,
        timezoneUsed: notificationPrefs.timezone,
        deliveryStatus: 'skipped_duplicate',
        createdAt: 'Just now',
      };
      setDispatchHistory((prev) => [skippedEntry, ...prev]);

      return {
        status: 'duplicate',
        title: 'Duplicate Notification Prevented (Idempotency Check Passed!)',
        detail: `A reminder for ${med.name} (${med.dosage}) was already recorded for ${recipientEmail} on ${localDateKey}. Duplicate dispatch blocked!`,
        idempotencyKey,
      };
    }

    // CRITICAL MEDICAL RULE: Sending a reminder sets state to 'Pending' (if not already Taken/Missed) — NEVER auto-marks 'Missed'!
    const nextState =
      med.status === 'Taken' || med.status === 'Missed' ? med.status : 'Pending';

    setMedications((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, status: nextState } : m))
    );

    const edgeRes = await invokeSmartNotificationsEdgeFunction({
      action: 'medication_reminder',
      medicationId: med.id,
    });
    const reallySentViaResend =
      edgeRes.invokedCloudFunction && edgeRes.resendConfigured;
    const deliveryStatus = reallySentViaResend ? 'sent' : 'simulated_local';

    const newDispatch = {
      id: `disp-${Date.now()}`,
      idempotencyKey,
      notificationType: 'MEDICATION_REMINDER',
      recipientEmail,
      recipientName: patientProfile?.fullName || 'Patient',
      recipientRole: 'patient',
      subject: `Medication Reminder: ${med.name} (${med.dosage}) at ${med.time}`,
      bodyPreview: `${
        reallySentViaResend
          ? 'Delivered via Resend API'
          : 'Simulated locally (Configure RESEND_API_KEY in Supabase Edge Function for live email delivery)'
      }: Take ${med.name} (${med.dosage}) — ${med.instructions} Dose state set to '${nextState}' (never auto-marked Missed).`,
      safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
      doseStateAtSend: nextState,
      timezoneUsed: notificationPrefs.timezone,
      deliveryStatus,
      createdAt: 'Just now',
    };

    setDispatchHistory((prev) => [newDispatch, ...prev]);
    pushNotification(
      'reminder',
      `Medication Reminder (${
        reallySentViaResend ? 'Sent via Resend' : 'Simulated'
      }): ${med.name}`,
      `Recipient: ${recipientEmail}. Dose marked '${nextState}' (${notificationPrefs.timezone}).`
    );

    return {
      status: 'sent',
      title: reallySentViaResend
        ? `Resend Email Delivered (Dose State: ${nextState})`
        : `Reminder Simulated Locally — RESEND_API_KEY Not Configured (Dose State: ${nextState})`,
      detail: reallySentViaResend
        ? `Live email delivered to ${recipientEmail} via Supabase Edge Function + Resend.`
        : `Dose state updated to '${nextState}' (never auto-marked Missed) and logged in dispatch history. External email was simulated because Supabase Edge Function / RESEND_API_KEY is not configured yet.`,
      idempotencyKey,
    };
  };

  const handleTriggerUnconfirmedCaregiverAlert = async (med, localDateKey) => {
    const authorizedRecipients = caregivers.filter(
      (c) => c.accessStatus !== 'revoked' && c.receivesMissedDoseAlerts !== false
    );

    if (authorizedRecipients.length === 0) {
      return {
        status: 'duplicate',
        title: 'No Active Authorized Caregivers',
        detail: 'All caregivers are either revoked or have alerts disabled.',
      };
    }

    const primaryCg = authorizedRecipients[0];
    const idempotencyKey = `unconfirmed_alert:${med.id}:${localDateKey}:${primaryCg.email}`;

    const alreadySent = dispatchHistory.some(
      (d) =>
        d.idempotencyKey === idempotencyKey &&
        (d.deliveryStatus === 'sent' || d.deliveryStatus === 'simulated_local')
    );

    if (alreadySent) {
      return {
        status: 'duplicate',
        title: 'Duplicate Caregiver Alert Prevented!',
        detail: `Overdue grace-period alert for ${med.name} was already recorded for ${primaryCg.name} (${primaryCg.email}) today.`,
        idempotencyKey,
      };
    }

    const nextState =
      med.status === 'Taken' || med.status === 'Missed'
        ? med.status
        : 'Unconfirmed';

    setMedications((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, status: nextState } : m))
    );

    const edgeRes = await invokeSmartNotificationsEdgeFunction({
      action: 'unconfirmed_caregiver_alert',
      medicationId: med.id,
    });
    const reallySentViaResend =
      edgeRes.invokedCloudFunction && edgeRes.resendConfigured;
    const deliveryStatus = reallySentViaResend ? 'sent' : 'simulated_local';

    const newEntries = authorizedRecipients.map((cg, idx) => ({
      id: `disp-${Date.now()}-${idx}`,
      idempotencyKey: `unconfirmed_alert:${med.id}:${localDateKey}:${cg.email}`,
      notificationType: 'UNCONFIRMED_DOSE_CAREGIVER_ALERT',
      recipientEmail: cg.email,
      recipientName: cg.name,
      recipientRole:
        cg.role === 'Professional Caretaker' ? 'caretaker' : 'family_member',
      subject: `CareConnect Check-In Alert: ${patientProfile?.preferredName}'s ${med.name} is Unconfirmed`,
      bodyPreview: `${
        reallySentViaResend ? 'Delivered via Resend API' : 'Simulated locally'
      }: Grace period (${notificationPrefs.unconfirmedGraceMinutes} mins) passed without confirmation for ${med.name} (${med.dosage}). Dose marked 'Unconfirmed (Overdue)' — not automatically Missed.`,
      safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
      doseStateAtSend: nextState,
      timezoneUsed: notificationPrefs.timezone,
      deliveryStatus,
      createdAt: 'Just now',
    }));

    setDispatchHistory((prev) => [...newEntries, ...prev]);
    pushNotification(
      'family',
      `Unconfirmed Dose Alert (${
        reallySentViaResend ? 'Sent via Resend' : 'Simulated'
      })`,
      `${med.name} marked 'Unconfirmed (Overdue)' after ${notificationPrefs.unconfirmedGraceMinutes}m grace period (${authorizedRecipients.length} active caregiver(s)).`
    );

    return {
      status: 'sent',
      title: reallySentViaResend
        ? `Resend Alert Delivered to ${authorizedRecipients.length} Authorized Caregiver(s)`
        : `Caregiver Overdue Alert Simulated Locally (${authorizedRecipients.length} Authorized Recipient(s))`,
      detail: `Dose marked '${nextState}' (never auto-marked Missed). Revoked users were excluded. ${
        reallySentViaResend
          ? 'Delivered via Resend.'
          : 'External email simulated until RESEND_API_KEY is set on the Edge Function.'
      }`,
      idempotencyKey,
    };
  };

  const handleTriggerAppointmentReminderEmail = async (apt, localDateKey) => {
    const recipientEmail = patientProfile?.email || 'patient@example.com';
    const idempotencyKey = `apt_reminder:${apt.id}:${localDateKey}:${notificationPrefs.appointmentLeadHours}h:${recipientEmail}`;

    const alreadySent = dispatchHistory.some(
      (d) =>
        d.idempotencyKey === idempotencyKey &&
        (d.deliveryStatus === 'sent' || d.deliveryStatus === 'simulated_local')
    );

    if (alreadySent) {
      return {
        status: 'duplicate',
        title: 'Duplicate Appointment Notification Prevented!',
        detail: `Appointment reminder for ${apt.doctorName} on ${apt.date} was already recorded today.`,
        idempotencyKey,
      };
    }

    const edgeRes = await invokeSmartNotificationsEdgeFunction({
      action: 'appointment_reminder',
      appointmentId: apt.id,
    });
    const reallySentViaResend =
      edgeRes.invokedCloudFunction && edgeRes.resendConfigured;
    const deliveryStatus = reallySentViaResend ? 'sent' : 'simulated_local';

    const newDispatch = {
      id: `disp-${Date.now()}`,
      idempotencyKey,
      notificationType: 'APPOINTMENT_REMINDER',
      recipientEmail,
      recipientName: patientProfile?.fullName || 'Patient',
      recipientRole: 'patient',
      subject: `Upcoming Appointment: ${apt.doctorName} (${apt.specialty}) on ${apt.date} at ${apt.time}`,
      bodyPreview: `${
        reallySentViaResend ? 'Delivered via Resend API' : 'Simulated locally'
      }: ${notificationPrefs.appointmentLeadHours}h advance notice for visit at ${apt.clinic}. Notes: ${apt.notes}`,
      safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
      doseStateAtSend: 'N/A (Appointment)',
      timezoneUsed: notificationPrefs.timezone,
      deliveryStatus,
      createdAt: 'Just now',
    };

    setDispatchHistory((prev) => [newDispatch, ...prev]);
    pushNotification(
      'appointment',
      `Appointment Reminder (${
        reallySentViaResend ? 'Sent via Resend' : 'Simulated'
      }): ${apt.doctorName}`,
      `Recipient: ${recipientEmail} (${notificationPrefs.appointmentLeadHours}h advance notice).`
    );

    return {
      status: 'sent',
      title: reallySentViaResend
        ? `Appointment Email Delivered via Resend`
        : `Appointment Reminder Simulated Locally (RESEND_API_KEY Not Configured)`,
      detail: `Recorded ${notificationPrefs.appointmentLeadHours}h reminder for ${apt.doctorName} (${apt.date} at ${apt.time}) for ${recipientEmail}.`,
      idempotencyKey,
    };
  };

  const handleTriggerSOS = () => {
    const emergencyNames = caregivers
      .filter((c) => c.isEmergencyContact && c.accessStatus !== 'revoked')
      .map((c) => c.name)
      .join(', ');

    handleAppendAuditLog({
      eventType: 'EMERGENCY_SOS_DISPATCHED',
      severity: 'critical',
      description: `Emergency SOS triggered. Dispatched alert to active emergency contacts: ${
        emergencyNames || 'Emergency Services'
      }.`,
    });

    pushNotification(
      'family',
      'EMERGENCY SOS ALERT SENT',
      `Emergency alert dispatched to primary caregivers (${
        emergencyNames || 'Emergency Contacts'
      }).`
    );
  };

  const handleResetDemoData = () => {
    setPatientProfile(initialPatientProfile);
    setMedications(initialMedications);
    setMedicationLogs(initialDoseLogs);
    setAppointments(initialAppointments);
    setCaregivers(initialCaregivers);
    setInvitations(initialInvitations);
    setAuditLogs(initialAuditLogs);
    setNotifications(initialNotifications);
    setActiveServerRole('patient');
    pushNotification(
      'reminder',
      'Demo Data Restored',
      'All sample medications, appointments, invitations, and audit logs have been reset.'
    );
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;
  const pendingMedsCount = medications.filter(
    (m) => m.status === 'Upcoming' || m.status === 'Due Now'
  ).length;

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      patientProfile={patientProfile}
      dbSyncStatus={`${dbSyncStatus} (${activeServerRole})`}
      unreadNotificationsCount={unreadNotificationsCount}
      pendingMedsCount={pendingMedsCount}
      caregivers={caregivers}
      onTriggerSOS={handleTriggerSOS}
      onResetDemoData={handleResetDemoData}
      onLogout={onLogout}
    >
      {activeTab === 'overview' && (
        <OverviewTab
          medications={medications}
          appointments={appointments}
          caregivers={caregivers.filter((c) => c.accessStatus !== 'revoked')}
          onRecordMedicationDose={handleRecordMedicationDose}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'medications' && (
        <MedicationsTab
          medications={medications}
          onRecordMedicationDose={handleRecordMedicationDose}
          onAddMedication={handleAddMedication}
          onEditMedication={handleEditMedication}
          onDeleteMedication={handleDeleteMedication}
        />
      )}

      {activeTab === 'appointments' && (
        <AppointmentsTab
          appointments={appointments}
          onAddAppointment={handleAddAppointment}
          onEditAppointment={handleEditAppointment}
          onToggleAppointmentStatus={handleToggleAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
        />
      )}

      {activeTab === 'caregivers' && (
        <FamilyCaregiversTab
          caregivers={caregivers}
          invitations={invitations}
          auditLogs={auditLogs}
          activeServerRole={activeServerRole}
          onSwitchSimulatedRole={(newRole) => {
            setActiveServerRole(newRole);
            handleAppendAuditLog({
              eventType: 'ROLE_CONTEXT_SWITCHED',
              severity: 'info',
              actorRole: newRole,
              description: `Switched active server role verification context to '${newRole}'.`,
            });
          }}
          isCloudConnected={isCloudConnected}
          onCreateInvitation={handleCreateInvitation}
          onMarkInvitationAccepted={handleMarkInvitationAccepted}
          onRevokeCaregiverAccess={handleRevokeCaregiverAccess}
          onRestoreCaregiverAccess={handleRestoreCaregiverAccess}
          onAppendAuditLog={handleAppendAuditLog}
        />
      )}

      {activeTab === 'reports' && (
        <AdherenceReportsTab
          medications={medications}
          medicationLogs={medicationLogs}
        />
      )}

      {activeTab === 'profile' && (
        <PatientProfileTab
          patientProfile={patientProfile}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          notifications={notifications}
          medications={medications}
          appointments={appointments}
          caregivers={caregivers}
          patientProfile={patientProfile}
          notificationPrefs={notificationPrefs}
          onUpdateNotificationPrefs={setNotificationPrefs}
          dispatchHistory={dispatchHistory}
          onTriggerSmartReminderEmail={handleTriggerSmartReminderEmail}
          onTriggerUnconfirmedCaregiverAlert={handleTriggerUnconfirmedCaregiverAlert}
          onTriggerAppointmentReminderEmail={handleTriggerAppointmentReminderEmail}
          onMarkAllRead={handleMarkAllRead}
          onToggleRead={handleToggleRead}
          onDeleteNotification={handleDeleteNotification}
        />
      )}
    </DashboardLayout>
  );
}
