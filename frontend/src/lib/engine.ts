// Global in-memory state for the Mock Engine

export type Campaign = {
  id: string;
  created: string;
  platform: string;
  isMock: boolean;
  status: 'Processing' | 'Completed' | 'Cancelled';
  product: string;
  variant: string;
  quantityTotal: number;
  quantityPerOrder: number;
  unitsCompleted: number;
  unitsTotal: number;
  unitsOver: number;
  progress: number;
  ordersSuccess: number;
  ordersFailed: number;
  ordersPending: number;
  user: string;
  cardType: string;
  parentCards: string[];
  addressLabel: string;
  gstLabel: string;
  cod: boolean;
  timeTaken: string;
};

export type Alert = {
  id: string;
  created: string;
  type: string;
  warning: string;
  email: string;
  orderUnit: string;
  status: 'Active' | 'Resolved';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
};

export type HistoryUnit = {
  id: string;
  platform: string;
  date: string;
  email: string;
  status: 'Delivered' | 'Cancelled' | 'Processing';
  product: string;
  orderId: string;
  bobOrder: boolean;
  amount: string;
  deliveryDate: string;
  otp: string;
  tracking: string;
  gstNo: string;
  phone: string;
  cod: string;
};

// Store interface
interface EngineStore {
  campaigns: Campaign[];
  alerts: Alert[];
  history: HistoryUnit[];
  metrics: {
    supercoinsApplied: number;
    loginRatio: number;
    loggedIn: number;
    failed: number;
    availableCoins: number;
    giftVouchers: number;
  };
  initialized: boolean;
}

// Ensure the store survives hot-reloads in development
const globalStore = global as unknown as { __ENGINE_STORE__: EngineStore };

if (!globalStore.__ENGINE_STORE__) {
  globalStore.__ENGINE_STORE__ = {
    campaigns: [],
    alerts: [],
    history: [],
    metrics: {
      supercoinsApplied: 0,
      loginRatio: 100,
      loggedIn: 1200,
      failed: 0,
      availableCoins: 15000,
      giftVouchers: 8000,
    },
    initialized: false
  };
}

const store = globalStore.__ENGINE_STORE__;

export const Engine = {
  getCampaigns: () => store.campaigns.slice().reverse(),
  getAlerts: () => store.alerts.slice().reverse(),
  getHistory: () => store.history.slice().reverse(),
  getMetrics: () => store.metrics,

  addCampaign: (campaignData: Partial<Campaign>) => {
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    const now = new Date();
    
    const newCampaign: Campaign = {
      id,
      created: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      platform: campaignData.platform || 'FLIPKART',
      isMock: campaignData.isMock || false,
      status: 'Processing',
      product: 'Automated Product Selection',
      variant: 'Default Variant',
      quantityTotal: campaignData.quantityTotal || 10,
      quantityPerOrder: campaignData.quantityPerOrder || 1,
      unitsCompleted: 0,
      unitsTotal: campaignData.quantityTotal || 10,
      unitsOver: 0,
      progress: 0,
      ordersSuccess: 0,
      ordersFailed: 0,
      ordersPending: campaignData.quantityTotal || 10,
      user: 'admin',
      cardType: campaignData.cardType || 'ICICI_PHYSICAL',
      parentCards: ['40XX...1234'],
      addressLabel: campaignData.addressLabel || 'Warehouse',
      gstLabel: campaignData.gstLabel || 'Default GST',
      cod: campaignData.cod || false,
      timeTaken: '0s'
    };

    store.campaigns.push(newCampaign);
    return newCampaign;
  },

  resolveAlert: (id: string) => {
    const alert = store.alerts.find(a => a.id === id);
    if (alert && alert.status === 'Active') {
      alert.status = 'Resolved';
    }
    return alert;
  },

  cancelOrder: (id: string) => {
    const campaign = store.campaigns.find(c => c.id === id);
    if (campaign && campaign.status === 'Processing') {
      campaign.status = 'Cancelled';
    }
    return campaign;
  },

  // The interval loop that simulates progress
  startSimulation: () => {
    if (store.initialized) return;
    store.initialized = true;

    setInterval(() => {
      // 1. Process active campaigns
      store.campaigns.forEach(campaign => {
        if (campaign.status === 'Processing') {
          // Randomly progress by 1 unit
          if (Math.random() > 0.5 && campaign.unitsCompleted < campaign.unitsTotal) {
            campaign.unitsCompleted += 1;
            
            // Randomly succeed or fail
            if (Math.random() > 0.1) {
              campaign.ordersSuccess += 1;
              store.metrics.supercoinsApplied += Math.floor(Math.random() * 50);
              
              // Add to history
              store.history.push({
                id: Math.random().toString(36).substr(2, 9),
                platform: campaign.platform,
                date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                email: `account_${Math.floor(Math.random() * 1000)}@bot.in`,
                status: 'Processing',
                product: campaign.product,
                orderId: `OD${Math.floor(Math.random() * 1000000000)}`,
                bobOrder: true,
                amount: `₹${Math.floor(Math.random() * 10000)}`,
                deliveryDate: 'Pending',
                otp: '—',
                tracking: '—',
                gstNo: '09AANCP...',
                phone: '999XXXXXXX',
                cod: campaign.cod ? 'Yes' : 'No'
              });

            } else {
              campaign.ordersFailed += 1;
              
              // Generate an alert on failure
              store.alerts.push({
                id: Math.random().toString(36).substr(2, 9),
                created: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'Order Placement Failed',
                warning: 'payment_gateway_rejected',
                email: `account_${Math.floor(Math.random() * 1000)}@bot.in`,
                orderUnit: `OD_FAILED_${Math.floor(Math.random() * 1000)}`,
                status: 'Active',
                severity: 'High'
              });
              
              store.metrics.failed += 1;
              store.metrics.loggedIn = Math.max(0, store.metrics.loggedIn - 1);
            }
            
            campaign.ordersPending = Math.max(0, campaign.ordersPending - 1);
            campaign.progress = Math.floor((campaign.unitsCompleted / campaign.unitsTotal) * 100);

            if (campaign.unitsCompleted >= campaign.unitsTotal) {
              campaign.status = 'Completed';
              campaign.progress = 100;
            }
          }
        }
      });
      
      // Keep arrays from growing infinitely
      if (store.history.length > 100) store.history = store.history.slice(-100);
      if (store.alerts.length > 50) store.alerts = store.alerts.slice(-50);

    }, 2000); // tick every 2 seconds
  }
};

// Start the background worker
Engine.startSimulation();
