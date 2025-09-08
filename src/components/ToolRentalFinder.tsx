import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, ExternalLink, Search, Filter, Star, Smartphone } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { ToolRentalAppsWindow } from './ToolRentalAppsWindow';

interface AccessCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  distance: number;
  cost: number; // 1-5 scale
  quality: number; // 1-5 scale
  options: number; // 1-5 scale (scope of tools/options available)
  internetRating: number; // 1-5 scale
  hasGeneralTools: boolean;
  hasHeavyEquipment: boolean;
  isLibrary: boolean;
  isMakerspace: boolean;
  isRentalApp: boolean;
  isRentalCenter: boolean;
  isRetailer: boolean;
  type: 'rental_center' | 'retailer' | 'library' | 'makerspace' | 'rental_app';
}

interface ToolRentalFinderProps {
  className?: string;
}

export function ToolRentalFinder({ className }: ToolRentalFinderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState('20');
  const [generalTools, setGeneralTools] = useState(true);
  const [heavyEquipment, setHeavyEquipment] = useState(false);
  const [automotiveTools, setAutomotiveTools] = useState(false);
  const [libraries, setLibraries] = useState(true);
  const [makerspaces, setMakerspaces] = useState(true);
  const [rentalApps, setRentalApps] = useState(true);
  const [rentalCenters, setRentalCenters] = useState(true);
  const [retailers, setRetailers] = useState(true);
  const [accessCenters, setAccessCenters] = useState<AccessCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAppsWindow, setShowAppsWindow] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      performSearch();
    } else if (debouncedSearchQuery.length === 0) {
      setAccessCenters([]);
      setHasSearched(false);
    }
  }, [debouncedSearchQuery, radius, generalTools, heavyEquipment, automotiveTools, libraries, makerspaces, rentalCenters, retailers]);

  const performSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      // Create comprehensive results based on search location
      const baseLocation = debouncedSearchQuery.split(',')[0] || debouncedSearchQuery;
      const baseState = debouncedSearchQuery.split(',')[1]?.trim() || 'MA';
      
      const mockResults: AccessCenter[] = [
        // Home Depot locations
        {
          id: 'home-depot-1',
          name: 'Home Depot Tool Rental - Downtown',
          address: '75 Kneeland St',
          city: baseLocation,
          state: baseState,
          phone: '(617) 442-0104',
          website: 'https://homedepot.com/toolrental',
          distance: 1.2,
          cost: 3,
          quality: 4,
          options: 4,
          internetRating: 3.8,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        {
          id: 'home-depot-2',
          name: 'Home Depot Tool Rental - South Bay',
          address: '100 Everett Ave',
          city: 'Somerville',
          state: baseState,
          phone: '(617) 591-0763',
          website: 'https://homedepot.com/toolrental',
          distance: 3.1,
          cost: 3,
          quality: 4,
          options: 4,
          internetRating: 3.9,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        {
          id: 'home-depot-3',
          name: 'Home Depot Tool Rental - Cambridge',
          address: '75 Mystic Ave',
          city: 'Medford',
          state: baseState,
          phone: '(781) 391-0011',
          website: 'https://homedepot.com/toolrental',
          distance: 4.5,
          cost: 3,
          quality: 4,
          options: 4,
          internetRating: 3.7,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        {
          id: 'home-depot-4',
          name: 'Home Depot Tool Rental - Watertown',
          address: '550 Arsenal St',
          city: 'Watertown',
          state: baseState,
          phone: '(617) 923-1114',
          website: 'https://homedepot.com/toolrental',
          distance: 6.2,
          cost: 3,
          quality: 4,
          options: 4,
          internetRating: 3.8,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        {
          id: 'home-depot-5',
          name: 'Home Depot Tool Rental - Dedham',
          address: '950 Providence Hwy',
          city: 'Dedham',
          state: baseState,
          phone: '(781) 251-0370',
          website: 'https://homedepot.com/toolrental',
          distance: 8.1,
          cost: 3,
          quality: 4,
          options: 4,
          internetRating: 3.6,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        // Harbor Freight locations
        {
          id: 'harbor-freight-1',
          name: 'Harbor Freight Tools',
          address: '220 Dorchester Ave',
          city: baseLocation,
          state: baseState,
          phone: '(617) 268-1800',
          website: 'https://harborfreight.com',
          distance: 2.1,
          cost: 1,
          quality: 2,
          options: 3,
          internetRating: 3.5,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        {
          id: 'harbor-freight-2',
          name: 'Harbor Freight Tools - Cambridge',
          address: '180 Somerville Ave',
          city: 'Cambridge',
          state: baseState,
          phone: '(617) 354-4600',
          website: 'https://harborfreight.com',
          distance: 3.8,
          cost: 1,
          quality: 2,
          options: 3,
          internetRating: 3.4,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        {
          id: 'harbor-freight-3',
          name: 'Harbor Freight Tools - Medford',
          address: '4138 Mystic Valley Pkwy',
          city: 'Medford',
          state: baseState,
          phone: '(781) 395-7870',
          website: 'https://harborfreight.com',
          distance: 5.2,
          cost: 1,
          quality: 2,
          options: 3,
          internetRating: 3.3,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        {
          id: 'harbor-freight-4',
          name: 'Harbor Freight Tools - Everett',
          address: '1051 Broadway',
          city: 'Everett',
          state: baseState,
          phone: '(617) 389-7300',
          website: 'https://harborfreight.com',
          distance: 6.7,
          cost: 1,
          quality: 2,
          options: 3,
          internetRating: 3.2,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        {
          id: 'harbor-freight-5',
          name: 'Harbor Freight Tools - Quincy',
          address: '1149 Hancock St',
          city: 'Quincy',
          state: baseState,
          phone: '(617) 472-9200',
          website: 'https://harborfreight.com',
          distance: 9.3,
          cost: 1,
          quality: 2,
          options: 3,
          internetRating: 3.4,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        // Lowe's locations (retail only, no tool rental)
        {
          id: 'lowes-1',
          name: 'Lowe\'s Home Improvement',
          address: '301 Falls Blvd',
          city: 'Quincy',
          state: baseState,
          phone: '(617) 471-0109',
          website: 'https://lowes.com',
          distance: 8.9,
          cost: 3,
          quality: 4,
          options: 3,
          internetRating: 3.7,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        {
          id: 'lowes-2',
          name: 'Lowe\'s Home Improvement',
          address: '1210 Broadway',
          city: 'Saugus',
          state: baseState,
          phone: '(781) 233-4200',
          website: 'https://lowes.com',
          distance: 11.2,
          cost: 3,
          quality: 4,
          options: 3,
          internetRating: 3.8,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: true,
          type: 'retailer'
        },
        // United Rentals
        {
          id: 'united-rentals-1',
          name: 'United Rentals',
          address: '789 Industrial Blvd',
          city: baseLocation,
          state: baseState,
          phone: '(617) 268-3500',
          website: 'https://unitedrentals.com',
          distance: 4.5,
          cost: 4,
          quality: 5,
          options: 5,
          internetRating: 4.1,
          hasGeneralTools: true,
          hasHeavyEquipment: true,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: false,
          type: 'rental_center'
        },
        // Makerspaces
        {
          id: 'boston-makers-1',
          name: 'Boston Makers',
          address: '500 Rutherford Ave',
          city: 'Charlestown',
          state: baseState,
          phone: '(617) 337-5038',
          website: 'https://bostonmakers.org',
          distance: 2.8,
          cost: 2,
          quality: 4,
          options: 4,
          internetRating: 4.3,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: true,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: false,
          type: 'makerspace'
        },
        {
          id: 'cambridge-hackspace-1',
          name: 'Cambridge Hackspace',
          address: '295 Norfolk St',
          city: 'Cambridge',
          state: baseState,
          phone: '(617) 555-0300',
          website: 'https://cambridgehackspace.com',
          distance: 3.2,
          cost: 2,
          quality: 4,
          options: 3,
          internetRating: 4.0,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: true,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: false,
          type: 'makerspace'
        },
        {
          id: 'framingham-makerspace-1',
          name: 'Framingham Makerspace',
          address: '33 Harrison Ave',
          city: 'Framingham',
          state: baseState,
          phone: '(508) 877-7473',
          website: 'https://framinghammakerspace.org',
          distance: 18.5,
          cost: 2,
          quality: 4,
          options: 4,
          internetRating: 4.2,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: true,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: false,
          type: 'makerspace'
        },
        // Libraries
        {
          id: 'library-1',
          name: 'Boston Public Library Tool Library',
          address: '700 Boylston St',
          city: baseLocation,
          state: baseState,
          phone: '(617) 536-5400',
          website: 'https://bpl.org/tools',
          distance: 1.5,
          cost: 1,
          quality: 3,
          options: 3,
          internetRating: 4.1,
          hasGeneralTools: true,
          hasHeavyEquipment: false,
          isLibrary: true,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: false,
          isRetailer: false,
          type: 'library'
        },
        // Automotive Tool Access
        {
          id: 'autozone-1',
          name: 'AutoZone Tool Rental',
          address: '1124 Commonwealth Ave',
          city: baseLocation,
          state: baseState,
          phone: '(617) 783-3932',
          website: 'https://autozone.com/toolrental',
          distance: 3.7,
          cost: 2,
          quality: 3,
          options: 3,
          internetRating: 3.8,
          hasGeneralTools: false,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        },
        {
          id: 'oreillys-1',
          name: 'O\'Reilly Auto Parts Tool Rental',
          address: '675 Centre St',
          city: 'Jamaica Plain',
          state: baseState,
          phone: '(617) 524-4327',
          website: 'https://oreillyauto.com/toolrental',
          distance: 4.1,
          cost: 2,
          quality: 3,
          options: 3,
          internetRating: 3.7,
          hasGeneralTools: false,
          hasHeavyEquipment: false,
          isLibrary: false,
          isMakerspace: false,
          isRentalApp: false,
          isRentalCenter: true,
          isRetailer: true,
          type: 'rental_center'
        }
      ];

      // Filter results based on selected criteria
      const filteredResults = mockResults.filter(center => {
        const withinRadius = center.distance <= parseInt(radius);
        
        // Check tool type matches
        let matchesToolType = false;
        if (generalTools && center.hasGeneralTools) matchesToolType = true;
        if (heavyEquipment && center.hasHeavyEquipment) matchesToolType = true;
        if (automotiveTools && (center.name.toLowerCase().includes('autozone') || center.name.toLowerCase().includes('reilly'))) {
          matchesToolType = true;
        }
        
        const matchesAccessType = (rentalCenters && center.isRentalCenter) ||
                                 (retailers && center.isRetailer) ||
                                 (libraries && center.isLibrary) ||
                                 (makerspaces && center.isMakerspace);
        
        return withinRadius && matchesToolType && matchesAccessType;
      }).sort((a, b) => a.distance - b.distance);

      setAccessCenters(filteredResults);
    } catch (error) {
      console.error('Error performing search:', error);
      setAccessCenters([]);
    }
    
    setLoading(false);
  };

  const getScaleRating = (rating: number, type: 'cost' | 'quality' | 'options') => {
    if (type === 'cost') {
      // For cost: Low is good (green), High is bad (red)
      if (rating <= 2) return { text: 'Low', color: 'text-green-600 dark:text-green-400' };
      if (rating <= 3) return { text: 'Med', color: 'text-yellow-600 dark:text-yellow-400' };
      return { text: 'High', color: 'text-red-600 dark:text-red-400' };
    } else {
      // For quality and options: Low is bad (red), High is good (green)
      if (rating <= 2) return { text: 'Low', color: 'text-red-600 dark:text-red-400' };
      if (rating <= 3) return { text: 'Med', color: 'text-yellow-600 dark:text-yellow-400' };
      return { text: 'High', color: 'text-green-600 dark:text-green-400' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rental_center': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'retailer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'library': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'makerspace': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'rental_app': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rental_center': return 'Rental Center';
      case 'retailer': return 'Retailer';
      case 'library': return 'Library';
      case 'makerspace': return 'Makerspace';
      case 'rental_app': return 'Rental App';
      default: return 'Tool Access';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tool Access Finder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Location (City, State or ZIP Code)
            </label>
            <Input
              placeholder="e.g., Boston, MA, 02101, or Home Depot"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Distance Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                <Filter className="h-4 w-4 inline mr-1" />
                Distance
              </label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="15">15 miles</SelectItem>
                  <SelectItem value="20">20 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tool Type Filters */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tool Types</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="general-tools"
                    checked={generalTools}
                    onCheckedChange={(checked) => setGeneralTools(checked === true)}
                  />
                  <label htmlFor="general-tools" className="text-sm">
                    General Tools
                  </label>
                </div>
                                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="heavy-equipment"
                    checked={heavyEquipment}
                    onCheckedChange={(checked) => setHeavyEquipment(checked === true)}
                  />
                  <label htmlFor="heavy-equipment" className="text-sm">
                    Heavy Equipment
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="automotive-tools"
                    checked={automotiveTools}
                    onCheckedChange={(checked) => setAutomotiveTools(checked === true)}
                  />
                  <label htmlFor="automotive-tools" className="text-sm">
                    Automotive
                  </label>
                </div>
              </div>
            </div>

            {/* Tool Access Type Filters */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tool Access Type</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rental-centers"
                    checked={rentalCenters}
                    onCheckedChange={(checked) => setRentalCenters(checked === true)}
                  />
                  <label htmlFor="rental-centers" className="text-sm">
                    Rental Centers
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="retailers"
                    checked={retailers}
                    onCheckedChange={(checked) => setRetailers(checked === true)}
                  />
                  <label htmlFor="retailers" className="text-sm">
                    Retailers
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="libraries"
                    checked={libraries}
                    onCheckedChange={(checked) => setLibraries(checked === true)}
                  />
                  <label htmlFor="libraries" className="text-sm">
                    Libraries
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="makerspaces"
                    checked={makerspaces}
                    onCheckedChange={(checked) => setMakerspaces(checked === true)}
                  />
                  <label htmlFor="makerspaces" className="text-sm">
                    Makerspaces
                  </label>
                </div>
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAppsWindow(true)}
                    className="w-full flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    Tool Rental Apps
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-muted-foreground">Searching for tool access locations...</p>
          </div>
        )}

        {!loading && hasSearched && accessCenters.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tool access locations found</h3>
              <p className="text-muted-foreground">
                Try expanding your search radius or adjusting your filters.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && accessCenters.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Found {accessCenters.length} tool access location{accessCenters.length !== 1 ? 's' : ''}
              </h3>
              <Badge variant="outline" className="text-xs">
                Within {radius} miles
              </Badge>
            </div>

            {/* Results Grid */}
            <div className="space-y-4">
              {accessCenters.map((center) => (
                <Card key={center.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{center.name}</h4>
                          <Badge className={`text-xs ${getTypeColor(center.type)}`}>
                            {getTypeLabel(center.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                          <MapPin className="h-4 w-4" />
                          <span>{center.address}, {center.city}, {center.state}</span>
                          <Badge variant="secondary" className="ml-2">
                            {center.distance.toFixed(1)} mi
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Rating Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Cost</div>
                        <div className={`text-sm font-medium ${getScaleRating(center.cost, 'cost').color}`}>
                          {getScaleRating(center.cost, 'cost').text}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Quality</div>
                        <div className={`text-sm font-medium ${getScaleRating(center.quality, 'quality').color}`}>
                          {getScaleRating(center.quality, 'quality').text}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Options/Scope</div>
                        <div className={`text-sm font-medium ${getScaleRating(center.options, 'options').color}`}>
                          {getScaleRating(center.options, 'options').text}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Internet Rating</div>
                        <div className="text-sm font-medium text-foreground">
                          {center.internetRating.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {center.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${center.phone}`} className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        </Button>
                      )}
                      {center.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={center.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Visit Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!hasSearched && !loading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Find Tool Access Locations</h3>
              <p className="text-muted-foreground">
                Enter a location to search for rental centers, retailers, libraries, makerspaces, and rental apps near you.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ToolRentalAppsWindow 
        open={showAppsWindow} 
        onClose={() => setShowAppsWindow(false)} 
      />
    </div>
  );
}