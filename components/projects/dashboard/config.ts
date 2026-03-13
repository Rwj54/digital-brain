import type { TabKey, VolumePresetOption } from "@/components/projects/dashboard/types";

export const DASHBOARD_PRESET_OPTIONS: VolumePresetOption[] = [
  {
    key: "jobs",
    label: "Contractor / Services",
    helper: "Landscaping, HVAC, roofing, contractors, home services.",
    singular: "Job",
    plural: "Jobs",
    example: "Example: 12 jobs/month",
  },
  {
    key: "tickets",
    label: "Retail / Service Counter",
    helper: "Walk-in retail, counter service, repair shop, salon desk.",
    singular: "Ticket",
    plural: "Tickets",
    example: "Example: 300 tickets/month",
  },
  {
    key: "orders",
    label: "Ecommerce / Delivery",
    helper: "Online orders, delivery, curbside orders.",
    singular: "Order",
    plural: "Orders",
    example: "Example: 500 orders/month",
  },
  {
    key: "appointments",
    label: "Appointments",
    helper: "Dentist, med spa, massage, consultations.",
    singular: "Appointment",
    plural: "Appointments",
    example: "Example: 90 appointments/month",
  },
  {
    key: "customers",
    label: "Generic (Customers)",
    helper: "Use this if none of the above fits.",
    singular: "Customer",
    plural: "Customers",
    example: "Example: 200 customers/month",
  },
  {
    key: "custom",
    label: "Custom Labels (Advanced)",
    helper: "Only if you want custom wording in the dashboard.",
    singular: "Event",
    plural: "Events",
    example: "Example: 50 events/month",
  },
];

export const DASHBOARD_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "data", label: "Data" },
  { key: "actions", label: "Action Plan" },
  { key: "settings", label: "Settings" },
];