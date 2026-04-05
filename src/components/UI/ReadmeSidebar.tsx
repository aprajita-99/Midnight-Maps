import { 
  X, Navigation, Shield,
  Lightbulb, Video, Info, 
  Layers, Zap, Smile, 
  Play, Map as MapIcon, Activity,
  LocateFixed, User, ShoppingBag
} from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function ReadmeSidebar() {
  const { isReadmeOpen, setReadmeOpen } = useNavigationStore();

  if (!isReadmeOpen) return null;

  const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="mb-10 group">
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover:bg-indigo-500/30 transition-all duration-300">
          <Icon size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">
          {title}
        </h3>
      </div>
      <div className="space-y-4 px-1 leading-relaxed">
        {children}
      </div>
    </div>
  );

  const Step = ({ number, title, desc }: { number: string, title: string, desc: string }) => (
    <div className="flex gap-4">
      <div className="text-[10px] font-black w-6 h-6 rounded-full border border-white/20 flex-shrink-0 flex items-center justify-center text-white/40 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-[12px] font-bold text-white mb-1.5">{title}</p>
        <p className="text-[11px] text-gray-400">{desc}</p>
      </div>
    </div>
  );

  const IconDetail = ({ icon: Icon, title, desc, color = "text-indigo-400" }: { icon: any, title: string, desc: string, color?: string }) => (
    <div className="flex gap-4 bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/[0.05] transition-all">
      <div className={`w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-200 mb-0.5">{title}</p>
        <p className="text-[10px] text-gray-500 leading-normal">{desc}</p>
      </div>
    </div>
  );

  const MetricDetail = ({ title, desc, icon: Icon }: { title: string, desc: string, icon: any }) => (
    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-indigo-400" />
        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-300">{title}</p>
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed font-medium">{desc}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setReadmeOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute inset-y-0 left-0 w-[420px] bg-[#0d121f]/98 shadow-[20px_0_50px_rgba(0,0,0,0.5)] border-r border-white/10 pointer-events-auto overflow-hidden flex flex-col"
        style={{
          backdropFilter: 'blur(40px)',
        }}
      >
        {/* Header Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 py-12 scroll-smooth custom-scrollbar relative z-10">
          
          {/* Header */}
          <div className="mb-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500/30 bg-indigo-500/10 p-1 shadow-[0_0_20px_rgba(34,197,94,0.15)] flex-shrink-0">
                <img src="/favicon.png" alt="Midnight Maps Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-none italic uppercase">
                  Midnight<br/><span className="text-indigo-500 not-italic tracking-normal">Maps</span>
                </h2>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/80 mb-1">Hackathon Note</p>
              <p className="text-[10px] text-gray-400 leading-normal italic">
                For demonstration, safety features are currently implemented within a 3km radius around Koramangala , Bangalore coordinates.
              </p>
            </div>
          </div>

          <Section icon={Navigation} title="GETTING STARTED">
            <Step 
              number="1" 
              title="Select Your Destination" 
              desc="Use the global search bar to set your start and end points. You can also double tap anywhere on the map to copy coordinates manually." 
            />
            <Step 
              number="2" 
              title="Optimize for Safety" 
              desc="The engine calculates multiple routes. Choose 'Safest' or 'Balanced' to prioritize well-lit, surveillance-rich streets over the shortest distance." 
            />
            <Step 
              number="3" 
              title="Inspect Your Way" 
              desc="Toggle map features (Lamps, Cameras) or click on the 'Safety Inspector' once to inspect any point on the map and then drag the green point to check other areas." 
            />
            <Step 
              number="4" 
              title="Experience First-Person" 
              desc="Hold and drag the pegman icon to visually inspect segments via street images. You can rate individual streets directly from the Street View HUD." 
            />
          </Section>

          <Section icon={Layers} title="HUD INTERFACE GUIDE">
            <div className="grid gap-3">
              <IconDetail icon={Shield} title="Nearby Alerts" desc="Highlights safe havens like Police Stations and Open Shops in real-time , works while you are navigating , especially useful at night time." />
              <IconDetail icon={Video} title="Camera Overlay" desc="Displays verified CCTV surveillance points on your map within some radius." />
              <IconDetail icon={Lightbulb} title="Street Lamps" desc="Displays verified Street Lamps data on the map." />
              <IconDetail icon={Zap} title="Midnight Toggle" desc="MANUAL DEMO MODE. Forces the AI to treat the current time as 12:00 AM to simulate nighttime risk regardless of Actual Time ." color="text-yellow-400" />
              <IconDetail icon={MapIcon} title="Map View" desc="Toggle between standard Roadmap and Satellite Hybrid view for better terrain understanding." color="text-blue-400" />
              <IconDetail icon={Activity} title="Traffic Layer" desc="Overlays high-definition traffic density visualization to help avoid congestion." color="text-red-400" />
              <IconDetail icon={LocateFixed} title="My Location" desc="Instantly re-center the map to your current GPS coordinates (Ensure Location is enabled)." color="text-green-400" />
              <IconDetail icon={User} title="Pegman / Street View" desc="Drag and drop this icon onto any highlighted street to enter first-person visual mode." color="text-orange-400" />
            </div>
          </Section>

          <Section icon={Play} title="SIMULATION & LEARNING">
            <p className="text-[11px] text-gray-400 mb-6 italic border-l-2 border-indigo-500/30 pl-4">
              Our safety model uses Reinforcement Learning (RL). Your interactions help train the AI to understand safe patterns.
            </p>
            <div className="space-y-4">
              <Step title="Continuous Simulation" desc="After choosing a route, Hit 'Simulate' to drive the route in 3D.To see how actual navigation would be (For Hackathon Purpose Only)." number="S" />
              <Step title="Feedback Rating" desc="When a trip ends, rate segments of your journey. This direct feedback is the primary source for our safety-weighting algorithm." number="R" />
            </div>
          </Section>

          <Section icon={Info} title="SCIENCE OF SAFETY">
            <div className="grid gap-4">
              <MetricDetail 
                icon={Lightbulb}
                title="Lightness" 
                desc="Calculated based on 'Lamps Data'. At night, this represents literal visibility. During day simulation, it defaults to max but factors in infrastructure density." 
              />
              <MetricDetail 
                icon={Video}
                title="Surveillance" 
                desc="Derived from 'Cameras Data'. Represents the density of verified surveillance in the immediate vicinity of a coordinate." 
              />
              <MetricDetail 
                icon={ShoppingBag}
                title="Street Activity" 
                desc="Calculated based on the opening and closing hours of shops and venues in the area. High activity zones indicate more 'eyes on the street'." 
              />
              <MetricDetail 
                icon={Smile}
                title="Context & Environment" 
                desc="A composite score based on Street Images telling what kind of environment it is , whether it is a residential neighborhood or isolated path in a jungle." 
              />
            </div>
          </Section>

          {/* Footer Close */}
          <div className="mt-10 mb-20 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-4">You're ready to navigate</p>
            <button 
              onClick={() => setReadmeOpen(false)}
              className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-black text-white uppercase tracking-widest"
            >
              Start Exploring
            </button>
          </div>
        </div>

        {/* Close Button Top-Right Sidebar */}
        <button 
          onClick={() => setReadmeOpen(false)}
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all z-20"
        >
          <X size={20} />
        </button>

      </motion.aside>
    </div>
  );
}
