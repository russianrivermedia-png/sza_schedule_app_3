import { supabase } from './supabase';

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
    const { data, error } = await supabase
      .from('schedules')
      .insert([scheduleData])
      .select('id, days, created_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select('id, days, created_at')
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
      .select('id, days, created_at')
      .contains('days', { week_key: weekKey })
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
  }
};

// Role Assignments Helpers
export const roleAssignmentsHelpers = {
  async add(staffId, role, shiftId = null, tourId = null, weekKey = null, isManual = false, createdBy = null) {
    const { data, error } = await supabase
      .from('role_assignments')
      .insert({
        staff_id: staffId,
        role: role,
        shift_id: shiftId,
        tour_id: tourId,
        week_key: weekKey,
        assignment_date: new Date().toISOString(),
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

    if (error) throw error;
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
