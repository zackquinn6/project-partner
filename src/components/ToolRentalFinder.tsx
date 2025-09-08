import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, ExternalLink, Search, Filter } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface RentalCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website?: string;
  distance: number;
  rating: number;
  hasGeneralTools: boolean;
  hasHeavyEquipment: boolean;
  priceRange: 'budget' | 'mid' | 'premium';
}

interface ToolRentalFinderProps {
  className?: string;
}

export function ToolRentalFinder({ className }: ToolRentalFinderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState('25');
  const [generalTools, setGeneralTools] = useState(true);
  const [heavyEquipment, setHeavyEquipment] = useState(true);
  const [rentalCenters, setRentalCenters] = useState<RentalCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Mock data for demonstration - in real implementation, this would come from an API
  const mockRentalCenters: RentalCenter[] = [
    {
      id: '1',
      name: 'Home Depot Tool Rental',
      address: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      phone: '(617) 555-0123',
      website: 'https://homedepot.com/toolrental',
      distance: 2.3,
      rating: 4.2,
      hasGeneralTools: true,
      hasHeavyEquipment: true,
      priceRange: 'mid'
    },
    {
      id: '2',
      name: 'United Rentals',
      address: '456 Industrial Ave',
      city: 'Cambridge',
      state: 'MA',
      zipCode: '02139',
      phone: '(617) 555-0456',
      website: 'https://unitedrentals.com',
      distance: 3.7,
      rating: 4.5,
      hasGeneralTools: true,
      hasHeavyEquipment: true,
      priceRange: 'premium'
    },
    {
      id: '3',
      name: 'Local Tool Supply',
      address: '789 Workshop Rd',
      city: 'Somerville',
      state: 'MA',
      zipCode: '02143',
      phone: '(617) 555-0789',
      distance: 4.1,
      rating: 4.0,
      hasGeneralTools: true,
      hasHeavyEquipment: false,
      priceRange: 'budget'
    },
    {
      id: '4',
      name: 'Pro Equipment Rental',
      address: '321 Commerce St',
      city: 'Brookline',
      state: 'MA',
      zipCode: '02446',
      phone: '(617) 555-0321',
      website: 'https://proequipment.com',
      distance: 5.2,
      rating: 4.7,
      hasGeneralTools: true,
      hasHeavyEquipment: true,
      priceRange: 'premium'
    },
    {
      id: '5',
      name: 'Budget Tools & More',
      address: '654 Thrifty Lane',
      city: 'Newton',
      state: 'MA',
      zipCode: '02458',
      phone: '(617) 555-0654',
      distance: 8.9,
      rating: 3.8,
      hasGeneralTools: true,
      hasHeavyEquipment: false,
      priceRange: 'budget'
    },
    {
      id: '6',
      name: 'NYC Tool Rental Hub',
      address: '100 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10038',
      phone: '(212) 555-0100',
      website: 'https://nyctoolrental.com',
      distance: 15.2,
      rating: 4.3,
      hasGeneralTools: true,
      hasHeavyEquipment: true,
      priceRange: 'mid'
    },
    {
      id: '7',
      name: 'Chicago Equipment Co',
      address: '500 Michigan Ave',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60611',
      phone: '(312) 555-0500',
      website: 'https://chicagoequip.com',
      distance: 25.8,
      rating: 4.6,
      hasGeneralTools: true,
      hasHeavyEquipment: true,
      priceRange: 'premium'
    },
    {
      id: '8',
      name: 'Austin Tool Co',
      address: '200 Congress Ave',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      phone: '(512) 555-0200',
      distance: 45.1,
      rating: 4.1,
      hasGeneralTools: true,
      hasHeavyEquipment: false,
      priceRange: 'budget'
    }
  ];

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      performSearch();
    } else if (debouncedSearchQuery.length === 0 && hasSearched) {
      setRentalCenters([]);
      setHasSearched(false);
    }
  }, [debouncedSearchQuery, radius, generalTools, heavyEquipment]);

  const performSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Filter mock data based on criteria
    let filteredCenters = mockRentalCenters.filter(center => {
      const query = debouncedSearchQuery.toLowerCase();
      const matchesLocation = center.city.toLowerCase().includes(query) ||
                             center.state.toLowerCase().includes(query) ||
                             center.zipCode.includes(debouncedSearchQuery) ||
                             center.name.toLowerCase().includes(query);
      
      const withinRadius = center.distance <= parseInt(radius);
      
      const matchesToolType = (generalTools && center.hasGeneralTools) || 
                             (heavyEquipment && center.hasHeavyEquipment);
      
      return matchesLocation && withinRadius && matchesToolType;
    });

    // Sort by distance
    filteredCenters.sort((a, b) => a.distance - b.distance);
    
    setRentalCenters(filteredCenters);
    setLoading(false);
  };

  const getPriceRangeColor = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return 'text-green-600';
      case 'mid': return 'text-yellow-600';
      case 'premium': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriceRangeLabel = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return '$';
      case 'mid': return '$$';
      case 'premium': return '$$$';
      default: return '$';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Tool Rental Centers
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
            <p className="text-muted-foreground">Searching for rental centers...</p>
          </div>
        )}

        {!loading && hasSearched && rentalCenters.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No rental centers found</h3>
              <p className="text-muted-foreground">
                Try expanding your search radius or adjusting your filters.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && rentalCenters.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Found {rentalCenters.length} rental center{rentalCenters.length !== 1 ? 's' : ''}
              </h3>
              <Badge variant="outline" className="text-xs">
                Within {radius} miles
              </Badge>
            </div>

            {rentalCenters.map((center) => (
              <Card key={center.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{center.name}</h4>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{center.address}, {center.city}, {center.state}</span>
                        <Badge variant="secondary" className="ml-2">
                          {center.distance} mi
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{center.rating}</span>
                      </div>
                      <span className={`text-lg font-bold ${getPriceRangeColor(center.priceRange)}`}>
                        {getPriceRangeLabel(center.priceRange)}
                      </span>
                    </div>
                  </div>

                  {/* Available Tool Types */}
                  <div className="flex gap-2 mb-3">
                    {center.hasGeneralTools && (
                      <Badge variant="outline" className="text-xs">
                        General Tools
                      </Badge>
                    )}
                    {center.hasHeavyEquipment && (
                      <Badge variant="outline" className="text-xs">
                        Heavy Equipment
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="h-4 w-4 mr-2" />
                      {center.phone}
                    </Button>
                    {center.website && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(center.website, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Website
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {!hasSearched && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Find Tool Rental Centers</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter your location (city, state, or ZIP code) above to find tool rental centers near you.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}