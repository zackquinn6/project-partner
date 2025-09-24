import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Search, Building2, FileText, Home, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackDialog } from './FeedbackDialog';

interface CodePermitsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  name: string;
}

interface BuildingCodeLink {
  title: string;
  url: string;
  description: string;
  category: string;
}

export function CodePermitsWindow({ open, onOpenChange }: CodePermitsWindowProps) {
  const { user } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedHome, setSelectedHome] = useState<string>("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  
  const usStates = [
    { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
  ];
  const [manualZip, setManualZip] = useState("");
  const [userHomes, setUserHomes] = useState<UserHome[]>([]);
  const [buildingCodes, setBuildingCodes] = useState<BuildingCodeLink[]>([]);
  const [permitLinks, setPermitLinks] = useState<BuildingCodeLink[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeLocation, setActiveLocation] = useState<string>("");

  // Fetch user homes on component load
  useEffect(() => {
    const fetchUserHomes = async () => {
      if (!user) return;
      
      try {
        const { data: homes, error } = await supabase
          .from('homes')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        setUserHomes(homes || []);
      } catch (error) {
        console.error('Error fetching user homes:', error);
      }
    };

    if (open && user) {
      fetchUserHomes();
    }
  }, [open, user]);

  const searchBuildingCodes = async (location: string) => {
    setIsSearching(true);
    try {
      const state = location.split(', ')[1];
      const city = location.split(', ')[0];
      
      // Get state full name for proper URL construction
      const stateFullName = usStates.find(s => s.code === state)?.name || state;
      
      const mockCodes: BuildingCodeLink[] = [
        {
          title: "International Building Code (IBC) 2021",
          url: "https://codes.iccsafe.org/content/IBC2021P1/preface",
          description: "Latest 2021 International Building Code with final action revisions.",
          category: "International"
        },
        {
          title: "International Residential Code (IRC) 2021",
          url: "https://codes.iccsafe.org/content/IRC2021P1/preface", 
          description: "Latest 2021 International Residential Code for residential buildings.",
          category: "International"
        },
        {
          title: "National Electrical Code (NEC) 2023",
          url: "https://www.nfpa.org/codes-and-standards/nec/nec-2023",
          description: "Latest 2023 National Electrical Code standards.",
          category: "National"
        },
        {
          title: `${city} Official Website`,
          url: `https://www.${city.toLowerCase().replace(/\s+/g, '')}.gov`,
          description: `Official government website for ${city}.`,
          category: "Local Government"
        },
        {
          title: `${stateFullName} Official Website`,
          url: `https://www.${stateFullName.toLowerCase().replace(/\s+/g, '')}.gov`,
          description: `Official state government website for ${stateFullName}.`,
          category: "State Government"
        }
      ];

      setBuildingCodes(mockCodes);
      setActiveLocation(location);
    } catch (error) {
      console.error('Error searching building codes:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchPermits = async (location: string) => {
    setIsSearching(true);
    try {
      const state = location.split(', ')[1];
      const city = location.split(', ')[0];
      
      // Get state full name for proper URL construction
      const stateFullName = usStates.find(s => s.code === state)?.name || state;
      
      const mockPermits: BuildingCodeLink[] = [
        {
          title: `${city} Building Permits`,
          url: `https://www.${city.toLowerCase().replace(/\s+/g, '')}.gov/permits`,
          description: `Official building permit portal for ${city}.`,
          category: "Local Government"
        },
        {
          title: `${city} Planning Department`,
          url: `https://www.${city.toLowerCase().replace(/\s+/g, '')}.gov/planning`,
          description: `Planning and zoning information for ${city}.`,
          category: "Local Government"
        },
        {
          title: `${stateFullName} Building Department`,
          url: `https://www.${stateFullName.toLowerCase().replace(/\s+/g, '')}.gov/building-permits`,
          description: `State-level building permit resources for ${stateFullName}.`,
          category: "State Government"
        },
        {
          title: `${city} Code Enforcement`,
          url: `https://www.${city.toLowerCase().replace(/\s+/g, '')}.gov/code-enforcement`,
          description: `Code enforcement and inspection services for ${city}.`,
          category: "Local Government"
        },
        {
          title: "HUD Building Permit Guide",
          url: "https://www.hud.gov/program_offices/housing/sfh/res/respermit",
          description: "Federal guidance on building permits and requirements.",
          category: "Federal Resources"
        }
      ];

      setPermitLinks(mockPermits);
      setActiveLocation(location);
    } catch (error) {
      console.error('Error searching permits:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHomeSelection = (homeId: string) => {
    const home = userHomes.find(h => h.id === homeId);
    if (home) {
      const location = `${home.city}, ${home.state}`;
      setSelectedHome(homeId);
      setActiveLocation(location);
      // Clear manual inputs when home is selected
      setManualCity("");
      setManualState("");
      setManualZip("");
    }
  };

  const handleHomeSearchCodes = () => {
    if (activeLocation) {
      searchBuildingCodes(activeLocation);
    }
  };

  const handleHomeSearchPermits = () => {
    if (activeLocation) {
      searchPermits(activeLocation);
    }
  };

  const handleManualSearch = (searchType: 'codes' | 'permits') => {
    if (!manualCity || !manualState) {
      return;
    }
    
    const location = `${manualCity}, ${manualState}`;
    if (searchType === 'codes') {
      searchBuildingCodes(location);
    } else {
      searchPermits(location);
    }
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        size="content-large"
        title="Code & Permits"
        description="This helps identify relevant building codes and permitting process when beginning a new project"
      >
        
        {/* Beta Banner */}
        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-b border-orange-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500 text-white">BETA</Badge>
              <span className="text-sm font-medium text-orange-800">
                Feature under development - Hit the ? icon in upper right to give us feedback!
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFeedback(true)}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="codes" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Building Codes
            </TabsTrigger>
            <TabsTrigger value="permits" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Permits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="flex-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <FileText className="h-4 w-4" />
                  Building Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {/* Home Selection */}
                {userHomes.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-sm">Your Homes:</Label>
                    <div className="flex gap-2">
                      <Select value={selectedHome} onValueChange={handleHomeSelection}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Choose home" />
                        </SelectTrigger>
                        <SelectContent>
                          {userHomes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              <div className="flex items-center gap-1 text-sm">
                                <Home className="h-3 w-3" />
                                {home.city}, {home.state}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeLocation && (
                        <Button 
                          onClick={handleHomeSearchCodes}
                          size="sm" 
                          className="h-8 px-3 text-sm"
                          disabled={isSearching}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Search
                        </Button>
                      )}
                    </div>
                    {activeLocation && <p className="text-xs text-muted-foreground">Selected: {activeLocation}</p>}
                  </div>
                )}

                {/* Manual Location Entry */}
                <div className="space-y-1">
                  <Label className="text-sm">Manual Entry:</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="City"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Select value={manualState} onValueChange={setManualState}>
                      <SelectTrigger className="h-7 text-xs w-20">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => handleManualSearch('codes')} 
                      disabled={isSearching || !manualCity || !manualState}
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <Search className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {buildingCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Building Codes for {activeLocation}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {buildingCodes.map((code, index) => (
                        <Card key={index} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{code.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{code.description}</p>
                                <span className="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded mt-2">
                                  {code.category}
                                </span>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={code.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="permits" className="flex-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Building2 className="h-4 w-4" />
                  Permits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {/* Home Selection */}
                {userHomes.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-sm">Your Homes:</Label>
                    <div className="flex gap-2">
                      <Select value={selectedHome} onValueChange={handleHomeSelection}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Choose home" />
                        </SelectTrigger>
                        <SelectContent>
                          {userHomes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              <div className="flex items-center gap-1 text-sm">
                                <Home className="h-3 w-3" />
                                {home.city}, {home.state}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeLocation && (
                        <Button 
                          onClick={handleHomeSearchPermits}
                          size="sm" 
                          className="h-8 px-3 text-sm"
                          disabled={isSearching}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Search
                        </Button>
                      )}
                    </div>
                    {activeLocation && <p className="text-xs text-muted-foreground">Selected: {activeLocation}</p>}
                  </div>
                )}

                {/* Manual Location Entry */}
                <div className="space-y-1">
                  <Label className="text-sm">Manual Entry:</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="City"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Select value={manualState} onValueChange={setManualState}>
                      <SelectTrigger className="h-7 text-xs w-20">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => handleManualSearch('permits')} 
                      disabled={isSearching || !manualCity || !manualState}
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <Search className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {permitLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Permit Information for {activeLocation}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {permitLinks.map((permit, index) => (
                        <Card key={index} className="border-l-4 border-l-accent">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{permit.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{permit.description}</p>
                                <span className="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded mt-2">
                                  {permit.category}
                                </span>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={permit.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </ResponsiveDialog>
      
      <FeedbackDialog 
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />
    </>
  );
}