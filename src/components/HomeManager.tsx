import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, MapPin, Calendar, Trash2, Star, Upload, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { HomeDetailsWindow } from './HomeDetailsWindow';
interface Home {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  home_type?: string;
  build_year?: string;
  home_ownership?: string;
  purchase_date?: string;
  notes?: string;
  is_primary: boolean;
  photos?: string[];
  created_at: string;
  updated_at: string;
}
interface HomeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHomeId?: string;
  onHomeSelected?: (homeId: string) => void;
  showSelector?: boolean;
}
export const HomeManager: React.FC<HomeManagerProps> = ({
  open,
  onOpenChange,
  selectedHomeId,
  onHomeSelected,
  showSelector = false
}) => {
  const {
    user
  } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHome, setEditingHome] = useState<Home | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    home_type: '',
    build_year: '',
    home_ownership: '',
    purchase_date: '',
    notes: '',
    is_primary: false
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedHomeForDetails, setSelectedHomeForDetails] = useState<Home | null>(null);
  const [showHomeDetails, setShowHomeDetails] = useState(false);
  useEffect(() => {
    if (open && user) {
      fetchHomes();
    }
  }, [open, user]);
  const fetchHomes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('homes').select('*').eq('user_id', user.id).order('is_primary', {
        ascending: false
      }).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setHomes(data || []);
    } catch (error) {
      console.error('Error fetching homes:', error);
      toast.error('Failed to load homes');
    } finally {
      setLoading(false);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };
  const uploadPhotos = async (homeId: string): Promise<string[]> => {
    if (selectedFiles.length === 0 || !user) return [];
    setUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${homeId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('home-photos').upload(fileName, file);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('home-photos').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload some photos');
    } finally {
      setUploading(false);
    }
    return uploadedUrls;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate required fields
    if (!formData.home_ownership) {
      toast.error('Please select whether you rent or own this home');
      return;
    }
    
    try {
      let homeId = editingHome?.id;
      if (editingHome) {
        // Update existing home
        const {
          error
        } = await supabase.from('homes').update({
          ...formData,
          updated_at: new Date().toISOString()
        }).eq('id', editingHome.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Create new home
        const {
          data: newHome,
          error
        } = await supabase.from('homes').insert({
          ...formData,
          user_id: user.id
        }).select().single();
        if (error) throw error;
        homeId = newHome.id;
      }

      // Upload photos if any
      let photoUrls: string[] = [];
      if (selectedFiles.length > 0 && homeId) {
        photoUrls = await uploadPhotos(homeId);

        // Update home with photo URLs
        if (photoUrls.length > 0) {
          const existingPhotos = (editingHome as any)?.photos || [];
          const allPhotos = [...existingPhotos, ...photoUrls];
          const {
            error: updateError
          } = await supabase.from('homes').update({
            photos: allPhotos
          } as any).eq('id', homeId);
          if (updateError) {
            console.error('Error updating photos:', updateError);
          }
        }
      }

      // If this is being set as primary, update other homes
      if (formData.is_primary) {
        await supabase.from('homes').update({
          is_primary: false
        }).eq('user_id', user.id).neq('id', homeId || '');
      }
      toast.success(editingHome ? 'Home updated successfully' : 'Home added successfully');
      setShowForm(false);
      setEditingHome(null);
      setSelectedFiles([]);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        home_type: '',
        build_year: '',
        home_ownership: '',
        purchase_date: '',
        notes: '',
        is_primary: false
      });
      fetchHomes();
    } catch (error) {
      console.error('Error saving home:', error);
      toast.error('Failed to save home');
    }
  };
  const handleEdit = (home: Home) => {
    setEditingHome(home);
    setFormData({
      name: home.name,
      address: home.address || '',
      city: home.city || '',
      state: home.state || '',
      home_type: home.home_type || '',
      build_year: home.build_year || '',
      home_ownership: home.home_ownership || '',
      purchase_date: home.purchase_date || '',
      notes: home.notes || '',
      is_primary: home.is_primary
    });
    setSelectedFiles([]);
    setShowForm(true);
  };
  const handleDelete = async (homeId: string) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('homes').delete().eq('id', homeId).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Home deleted successfully');
      fetchHomes();
    } catch (error) {
      console.error('Error deleting home:', error);
      toast.error('Failed to delete home');
    }
  };
  const handleSetPrimary = async (homeId: string) => {
    if (!user) return;
    try {
      // Set all homes to not primary
      await supabase.from('homes').update({
        is_primary: false
      }).eq('user_id', user.id);

      // Set selected home as primary
      const {
        error
      } = await supabase.from('homes').update({
        is_primary: true
      }).eq('id', homeId).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Primary home updated');
      fetchHomes();
    } catch (error) {
      console.error('Error setting primary home:', error);
      toast.error('Failed to set primary home');
    }
  };

  const handleHomeClick = (home: Home) => {
    setSelectedHomeForDetails(home);
    setShowHomeDetails(true);
  };
  if (showSelector) {
    // Simple selector mode for project creation
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Select Home for Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {homes.map(home => <Card key={home.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedHomeId === home.id ? 'ring-2 ring-primary' : ''}`} onClick={() => onHomeSelected?.(home.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{home.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {home.city && home.state ? `${home.city}, ${home.state}` : 'Location not specified'}
                      </p>
                    </div>
                    {home.is_primary && <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Primary
                      </Badge>}
                  </div>
                </CardContent>
              </Card>)}
            
            <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>;
  }
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:max-w-6xl sm:max-h-[95vh] overflow-y-auto border-none sm:border p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-none">
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Manage Your Homes
          </DialogTitle>
        </DialogHeader>

        {!showForm ? <div className="space-y-6 p-4 sm:p-0">
            {/* Header */}
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Manage your home locations for projects and maintenance. Each project/maintenance task is associated with a specific home.
              </p>
              <Button 
                onClick={() => setShowForm(true)}
                size="sm"
                className="md:w-auto md:px-4 w-10 h-10 p-0 md:p-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Add Home</span>
              </Button>
            </div>

            {/* Homes Grid */}
            {loading ? <div className="text-center py-8">Loading homes...</div> : homes.length === 0 ? <Card>
                <CardContent className="text-center py-8">
                  <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No homes added yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first home to start organizing your DIY projects by location.
                  </p>
              <Button 
                size="sm"
                onClick={() => setShowForm(true)}
                className="md:w-auto md:px-4 w-10 h-10 p-0 md:p-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Add Home</span>
              </Button>
                </CardContent>
              </Card> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homes.map(home => <Card key={home.id} className={home.is_primary ? 'ring-2 ring-primary cursor-pointer hover:shadow-md transition-shadow' : 'cursor-pointer hover:shadow-md transition-shadow'} onClick={() => handleHomeClick(home)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Home Photo Icon */}
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                            {home.photos && home.photos.length > 0 ? <img src={home.photos[0]} alt={`${home.name} photo`} className="w-full h-full object-cover" /> : <Home className="w-6 h-6 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg flex items-center gap-2 truncate">
                              {home.name}
                              {home.is_primary && <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  <Star className="w-3 h-3 mr-1" />
                                  Primary
                                </Badge>}
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(home)} className="px-2 md:px-3">
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">E</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(home.id)} className="px-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {home.address && <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {home.address}
                            {home.city && home.state && `, ${home.city}, ${home.state}`}
                          </span>
                        </div>}
                      
                      {home.home_type}
                      
                      {home.build_year && <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Built in {home.build_year}</span>
                        </div>}
                      
                      {!home.is_primary && <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(home.id);
                        }} className="w-full mt-3">
                          <Star className="w-4 h-4 mr-2" />
                          Set as Primary
                        </Button>}
                    </CardContent>
                  </Card>)}
              </div>}
          </div> : (/* Form */
      <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingHome ? 'Edit Home' : 'Add New Home'}
              </h3>
              <Button type="button" variant="ghost" onClick={() => {
            setShowForm(false);
            setEditingHome(null);
          }}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Home Name *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} placeholder="e.g., Main House, Beach House" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_type">Home Type</Label>
                <Select value={formData.home_type} onValueChange={value => setFormData(prev => ({
              ...prev,
              home_type: value
            }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select home type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-family">Single Family</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="mobile">Mobile Home</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_ownership">Rent or Own *</Label>
                <Select value={formData.home_ownership} onValueChange={value => setFormData(prev => ({
              ...prev,
              home_ownership: value
            }))} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ownership status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={e => setFormData(prev => ({
              ...prev,
              address: e.target.value
            }))} placeholder="Street address" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={e => setFormData(prev => ({
              ...prev,
              city: e.target.value
            }))} placeholder="City" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={formData.state} onValueChange={value => setFormData(prev => ({
              ...prev,
              state: value
            }))} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'].map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="build_year">Year Built</Label>
                <Input id="build_year" value={formData.build_year} onChange={e => setFormData(prev => ({
              ...prev,
              build_year: e.target.value
            }))} placeholder="e.g., 1985" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input 
                  id="purchase_date" 
                  type="date" 
                  value={formData.purchase_date} 
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    purchase_date: e.target.value
                  }))} 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))} 
                  placeholder="Additional notes about this home..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="photos">Home Photos</Label>
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4">
                  <input id="photos" type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('photos')?.click()} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photos ({selectedFiles.length} selected)
                  </Button>
                  {selectedFiles.length > 0 && <div className="mt-2 text-sm text-muted-foreground">
                      {selectedFiles.map((file, index) => <div key={index} className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          {file.name}
                        </div>)}
                    </div>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button type="button" variant="outline" onClick={() => {
            setShowForm(false);
            setEditingHome(null);
            setSelectedFiles([]);
          }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : editingHome ? 'Update Home' : 'Add Home'}
              </Button>
            </div>
          </form>)}
      </DialogContent>
    </Dialog>
    
    <HomeDetailsWindow
      open={showHomeDetails}
      onOpenChange={setShowHomeDetails}
      home={selectedHomeForDetails}
    />
  </>;
};