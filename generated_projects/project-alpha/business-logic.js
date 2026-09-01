/**
 * business-logic.js
 * Core Domain Logic & State Machine Engine for Hotel Management System
 * Architect: Ethan Vance, Principal Logic & Systems Architect
 */

const HotelBusinessEngine = (() => {
    'use strict';

    // --- Constants & Configurations ---
    const ROOM_TYPES = {
        SINGLE: { basePrice: 100, capacity: 1 },
        DOUBLE: { basePrice: 150, capacity: 2 },
        SUITE: { basePrice: 300, capacity: 4 },
    };

    const BOOKING_STATES = {
        PENDING: 'PENDING',
        CONFIRMED: 'CONFIRMED',
        CHECKED_IN: 'CHECKED_IN',
        CHECKED_OUT: 'CHECKED_OUT',
        CANCELLED: 'CANCELLED',
    };

    // Valid State Transitions
    const STATE_TRANSITIONS = {
        [BOOKING_STATES.PENDING]: [BOOKING_STATES.CONFIRMED, BOOKING_STATES.CANCELLED],
        [BOOKING_STATES.CONFIRMED]: [BOOKING_STATES.CHECKED_IN, BOOKING_STATES.CANCELLED],
        [BOOKING_STATES.CHECKED_IN]: [BOOKING_STATES.CHECKED_OUT],
        [BOOKING_STATES.CHECKED_OUT]: [],
        [BOOKING_STATES.CANCELLED]: [],
    };

    // --- Validation Utilities ---
    const Validator = {
        isValidDateRange: (start, end) => {
            const startDate = new Date(start);
            const endDate = new Date(end);
            return startDate < endDate && startDate >= new Date('2000-01-01');
        },
        isWithinCapacity: (roomType, guestCount) => {
            return guestCount <= ROOM_TYPES[roomType].capacity;
        },
        isValidPayment: (paymentDetails) => {
            // Mock validation logic for payment tokens
            return paymentDetails && paymentDetails.token && paymentDetails.amount > 0;
        }
    };

    // --- Pricing Engine ---
    const PricingEngine = {
        /**
         * Calculates total stay cost using a dynamic multiplier based on occupancy and season.
         * Formula: (BaseRate * Days * SeasonalMultiplier) + Taxes
         */
        calculateStayCost: (roomType, startDate, endDate, options = {}) => {
            const { occupancyRate = 0.5, isPeakSeason = false } = options;
            
            const basePrice = ROOM_TYPES[roomType].basePrice;
            const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
            
            // Algorithmic Surge Pricing: 
            // Increase price by 20% if occupancy > 80%, or 50% if Peak Season
            let multiplier = 1.0;
            if (isPeakSeason) multiplier += 0.5;
            if (occupancyRate > 0.8) multiplier += 0.2;

            const subtotal = basePrice * days * multiplier;
            const taxRate = 0.12; // 12% VAT
            
            return {
                subtotal: parseFloat(subtotal.toFixed(2)),
                tax: parseFloat((subtotal * taxRate).toFixed(2)),
                total: parseFloat((subtotal * (1 + taxRate)).toFixed(2)),
                days
            };
        }
    };

    // --- State Machine Engine ---
    class BookingStateMachine {
        constructor(bookingId, initialState = BOOKING_STATES.PENDING) {
            this.bookingId = bookingId;
            this.currentState = initialState;
            this.history = [{ state: initialState, timestamp: new Date() }];
        }

        transition(newState) {
            const allowedTransitions = STATE_TRANSITIONS[this.currentState];
            
            if (allowedTransitions.includes(newState)) {
                this.currentState = newState;
                this.history.push({ state: newState, timestamp: new Date() });
                return { success: true, state: this.currentState };
            }
            
            throw new Error(`Invalid state transition from ${this.currentState} to ${newState}`);
        }

        getState() {
            return this.currentState;
        }
    }

    // --- Transaction Workflow Orchestrator ---
    const WorkflowManager = {
        /**
         * Orchestrates the process of creating a reservation
         */
        processReservation: async (reservationData) => {
            const { roomType, startDate, endDate, guests, payment } = reservationData;

            // 1. Validation Phase
            if (!Validator.isValidDateRange(startDate, endDate)) {
                throw new Error("Invalid date range provided.");
            }
            if (!Validator.isWithinCapacity(roomType, guests)) {
                throw new Error(`Room type ${roomType} cannot accommodate ${guests} guests.`);
            }

            // 2. Pricing Phase
            const pricing = PricingEngine.calculateStayCost(roomType, startDate, endDate);

            // 3. Payment Verification
            if (!Validator.isValidPayment({ ...payment, amount: pricing.total })) {
                throw new Error("Payment verification failed.");
            }

            // 4. State Initialization
            const bookingId = `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const sm = new BookingStateMachine(bookingId);

            // Transition to Confirmed upon successful payment
            sm.transition(BOOKING_STATES.CONFIRMED);

            return {
                bookingId,
                status: sm.getState(),
                pricing,
                confirmation: `Reservation ${bookingId} confirmed for ${pricing.days} nights.`
            };
        }
    };

    // Public API
    return {
        Validator,
        PricingEngine,
        BookingStateMachine,
        WorkflowManager,
        ROOM_TYPES,
        BOOKING_STATES
    };
})();

// --- Example Usage / Integration Test ---
(async () => {
    try {
        console.log("--- Initializing Hotel Booking Workflow ---");
        
        const myBooking = await HotelBusinessEngine.WorkflowManager.processReservation({
            roomType: 'SUITE',
            startDate: '2023-12-01',
            endDate: '2023-12-05',
            guests: 3,
            payment: { token: 'tok_visa_123', amount: 1200 }
        });

        console.log("Reservation Success:", myBooking);

        // Simulate Guest Lifecycle
        const lifecycle = new HotelBusinessEngine.BookingStateMachine(myBooking.bookingId, myBooking.status);
        
        console.log("Current State:", lifecycle.getState()); // CONFIRMED
        lifecycle.transition(HotelBusinessEngine.BOOKING_STATES.CHECKED_IN);
        console.log("New State:", lifecycle.getState()); // CHECKED_IN
        lifecycle.transition(HotelBusinessEngine.BOOKING_STATES.CHECKED_OUT);
        console.log("Final State:", lifecycle.getState()); // CHECKED_OUT

    } catch (error) {
        console.error("Business Logic Error:", error.message);
    }
})();