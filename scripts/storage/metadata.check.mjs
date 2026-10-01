import{test}from'node:test';import assert from'node:assert/strict';
import{boundMetadataMatches}from'../../src/lib/gcs/core.mjs';
test('pre-quota handoff receipts accept newly derived charging identity only',()=>{
 const stored={tenantId:'org',tokenId:'handoff',folder:'Photos'},current={...stored,chargingUserId:'creator'};
 assert.equal(boundMetadataMatches({metadata:stored},current),true);
 assert.equal(boundMetadataMatches({metadata:stored},{...current,tenantId:'other'}),false);
 assert.equal(boundMetadataMatches({metadata:stored,quota:{tenantId:'org',userId:'creator'}},current),false);
 assert.equal(boundMetadataMatches({metadata:current,quota:{tenantId:'org',userId:'creator'}},{...current,chargingUserId:'other'}),false);
});
