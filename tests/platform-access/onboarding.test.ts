import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolveEligibleOrganization} from '../../src/lib/platform-access-core';
test('eligible accounts with no memberships retain onboarding while denied memberships stay distinct',async()=>{
 assert.deepEqual(await resolveEligibleOrganization([],undefined,async()=>true),{organizationId:null,state:'onboarding'});
 assert.deepEqual(await resolveEligibleOrganization([{tenantId:'denied'}],undefined,async()=>false),{organizationId:null,state:'denied'});
 assert.deepEqual(await resolveEligibleOrganization([{tenantId:'denied'},{tenantId:'eligible'}],'denied',async id=>id==='eligible'),{organizationId:'eligible',state:'ready'});
});
