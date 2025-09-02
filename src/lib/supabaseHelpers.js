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
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
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
      .select('*')
      .contains('days', { week_key: weekKey })
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
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
