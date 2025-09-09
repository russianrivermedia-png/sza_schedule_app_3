import { supabase } from './supabase';
import { format } from 'date-fns';

// Staff operations
export const staffHelpers = {
  async add(staffData) {
    const { data, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

// Role operations
export const roleHelpers = {
  async add(roleData) {
    const { data, error } = await supabase
      .from('roles')
      .insert([roleData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

// Tour operations
export const tourHelpers = {
  async add(tourData) {
    const { data, error } = await supabase
      .from('tours')
      .insert([tourData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('tours')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('tours')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

// Shift operations
export const shiftHelpers = {
  async add(shiftData) {
    const { data, error } = await supabase
      .from('shifts')
      .insert([shiftData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

// Schedule operations
export const scheduleHelpers = {
  async add(scheduleData) {
    const scheduleWithVersion = {
      ...scheduleData,
      version: 1,
      last_modified_at: new Date().toISOString(),
      is_locked: false
    };
    
    const { data, error } = await supabase
      .from('schedules')
      .insert([scheduleWithVersion])
      .select('id, days, created_at, version, last_modified_by, last_modified_at, is_locked, locked_by, locked_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates, expectedVersion = null, userId = null) {
    // If version control is enabled, check version first
    if (expectedVersion !== null) {
      const { data: currentSchedule, error: fetchError } = await supabase
        .from('schedules')
        .select('version, is_locked, locked_by')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if schedule is locked by another user
      if (currentSchedule.is_locked && currentSchedule.locked_by !== userId) {
        throw new Error('Schedule is currently being edited by another user. Please try again later.');
      }
      
      // Check version mismatch
      if (currentSchedule.version !== expectedVersion) {
        throw new Error('Schedule has been modified by another user. Please refresh and try again.');
      }
    }
    
    const updatesWithVersion = {
      ...updates,
      version: expectedVersion ? expectedVersion + 1 : undefined,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId
    };
    
    const { data, error } = await supabase
      .from('schedules')
      .update(updatesWithVersion)
      .eq('id', id)
      .select('id, days, created_at, version, last_modified_by, last_modified_at, is_locked, locked_by, locked_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async lockSchedule(id, userId) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        is_locked: true,
        locked_by: userId,
        locked_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_locked', false) // Only lock if not already locked
      .select('id, is_locked, locked_by, locked_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async unlockSchedule(id, userId) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        is_locked: false,
        locked_by: null,
        locked_at: null
      })
      .eq('id', id)
      .eq('locked_by', userId) // Only unlock if locked by current user
      .select('id, is_locked, locked_by, locked_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByWeek(weekKey) {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, days, created_at, version, last_modified_by, last_modified_at, is_locked, locked_by, locked_at')
      .eq('days->>week_key', weekKey)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, days, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Time off request operations
export const timeOffHelpers = {
  async add(timeOffData) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([timeOffData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('time_off_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByStaff(staffId) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('staff_id', staffId)
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  // Optimized query for time off conflicts within a date range
  async getConflictsForWeek(weekStart, weekEnd) {
    // Format dates as ISO strings for Supabase
    const weekStartISO = weekStart.toISOString().split('T')[0];
    const weekEndISO = weekEnd.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('staff_id, start_date, end_date, id')
      .eq('status', 'approved')
      .gte('end_date', weekStartISO) // time off ends on or after week start
      .lte('start_date', weekEndISO) // time off starts on or before week end
      .order('staff_id, start_date');
    
    if (error) throw error;
    return data;
  },

  // Get time off conflicts for a specific staff member and date
  async getConflictsForStaffAndDate(staffId, date) {
    // Format date as ISO string for Supabase
    const dateISO = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('id, start_date, end_date')
      .eq('staff_id', staffId)
      .eq('status', 'approved')
      .lte('start_date', dateISO) // time off starts on or before the date
      .gte('end_date', dateISO)   // time off ends on or after the date
    
    if (error) throw error;
    return data;
  }
};

// Role Assignments Helpers
export const roleAssignmentsHelpers = {
  async add(staffId, role, shiftId = null, tourId = null, weekKey = null, isManual = false, createdBy = null, assignmentDate = null) {
    // Use the provided assignment date, or default to current time
    const assignmentDateToUse = assignmentDate || new Date().toISOString();
    
    const { data, error } = await supabase
      .from('role_assignments')
      .insert({
        staff_id: staffId,
        role: role,
        shift_id: shiftId,
        tour_id: tourId,
        week_key: weekKey,
        assignment_date: assignmentDateToUse,
        is_manual: isManual,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByStaff(staffId) {
    const { data, error } = await supabase
      .from('role_assignments')
      .select('*')
      .eq('staff_id', staffId)
      .order('assignment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSummaryByStaff(staffId) {
    const { data, error } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('staff_id', staffId);

    if (error) throw error;
    
    // Count role assignments
    const summary = {};
    data.forEach(assignment => {
      summary[assignment.role] = (summary[assignment.role] || 0) + 1;
    });
    
    return summary;
  },

  async delete(assignmentId) {
    const { error } = await supabase
      .from('role_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;
  },

  async getAssignmentsForWeek(weekStart, weekEnd) {
    // Get assignments for the specific week by filtering on assignment_date
    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(weekEnd);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
      .from('role_assignments')
      .select('staff_id, role, assignment_date')
      .gte('assignment_date', startOfWeek.toISOString())
      .lte('assignment_date', endOfWeek.toISOString());

    if (error) throw error;
    return data || [];
  },

  async clearWeekAssignments(weekStart, weekEnd) {
    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(weekEnd);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('🗑️ Clearing assignments for week:', {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString()
    });

    const { error } = await supabase
      .from('role_assignments')
      .delete()
      .gte('assignment_date', startOfWeek.toISOString())
      .lte('assignment_date', endOfWeek.toISOString());

    if (error) throw error;
    console.log('✅ Week assignments cleared successfully');
    return true;
  }
};

// Account Management Helpers
export const accountHelpers = {
  // Link staff to user account
  async linkStaffToUser(staffId, userId) {
    const { data, error } = await supabase
      .from('staff')
      .update({ 
        user_id: userId, 
        account_status: 'active' 
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Unlink staff from user account
  async unlinkStaffFromUser(staffId) {
    const { data, error } = await supabase
      .from('staff')
      .update({ 
        user_id: null, 
        account_status: 'no_account' 
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update account status
  async updateAccountStatus(staffId, status) {
    const { data, error } = await supabase
      .from('staff')
      .update({ account_status: status })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get staff with account information
  async getStaffWithAccounts() {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        user_id,
        account_status
      `)
      .order('name');

    if (error) throw error;
    return data;
  },

  // Get staff by user ID
  async getStaffByUserId(userId) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no staff record found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  }
};

// Staff Verification Helpers
export const staffVerificationHelpers = {
  // Create verification code
  async createVerificationCode(staffId, email) {
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const { data, error } = await supabase
      .from('staff_verification')
      .insert({
        staff_id: staffId,
        verification_code: verificationCode,
        email: email,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Verify code
  async verifyCode(verificationCode) {
    const { data, error } = await supabase
      .from('staff_verification')
      .select(`
        *,
        staff:staff_id(*)
      `)
      .eq('verification_code', verificationCode)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    return data;
  },

  // Mark code as used
  async markCodeAsUsed(verificationId) {
    const { data, error } = await supabase
      .from('staff_verification')
      .update({ is_used: true })
      .eq('id', verificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get verification by staff ID
  async getByStaffId(staffId) {
    const { data, error } = await supabase
      .from('staff_verification')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// User Management Helpers
export const userHelpers = {
  // Get all users
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get user by ID
  async getById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user role
  async updateRole(userId, newRole) {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user details
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete user account
  async deleteUser(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  // Get users with staff information
  async getUsersWithStaff() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        staff:staff_id(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Check if user exists
  async userExists(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return !!data;
  }
};

// Account Audit Helpers
export const accountAuditHelpers = {
  // Log account action
  async logAction(staffId, action, performedBy = null, notes = null) {
    const { data, error } = await supabase
      .from('account_audit')
      .insert({
        staff_id: staffId,
        action: action,
        performed_by: performedBy,
        notes: notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get audit history for staff
  async getByStaffId(staffId) {
    const { data, error } = await supabase
      .from('account_audit')
      .select('*')
      .eq('staff_id', staffId)
      .order('performed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all audit history
  async getAll() {
    const { data, error } = await supabase
      .from('account_audit')
      .select(`
        *,
        staff:staff_id(name)
      `)
      .order('performed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
